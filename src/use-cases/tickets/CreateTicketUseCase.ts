
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notifyLowStock, notifyTicketCreated } from '@/lib/ticket-notifications';
import { CreateTicketInput } from '@/lib/schemas';

export interface CreateTicketParams {
    ticketData: CreateTicketInput;
    customerInfo: {
        customerName?: string;
        customerId?: string;
        customerEmail?: string;
        customerPhone?: string;
        customerDpi?: string;
        customerNit?: string;
    };
    tenantId: string;
    userId: string;
}

export class CreateTicketUseCase {
    static async execute({ ticketData, customerInfo, tenantId, userId }: CreateTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const { customerName, customerId, customerEmail, customerPhone, customerDpi, customerNit } = customerInfo;
        
        let customer = null;

        if (customerId) {
            customer = await tenantDb.customer.findUnique({
                where: { id: customerId }
            });
        }

        if (!customer && customerEmail) {
            customer = await tenantDb.customer.findFirst({
                where: { email: customerEmail }
            });
        }

        if (!customer && customerPhone) {
            customer = await tenantDb.customer.findFirst({
                where: { phone: customerPhone }
            });
        }

        if (!customer && customerName) {
            customer = await tenantDb.customer.findFirst({
                where: { name: customerName }
            });
        }

        if (!customer) {
            if (!customerName) {
                 throw new Error('Nombre de cliente requerido para crear uno nuevo.');
            }

            customer = await tenantDb.customer.create({
                data: {
                    name: customerName,
                    email: customerEmail || null,
                    phone: customerPhone || null,
                    dpi: customerDpi || null,
                    nit: customerNit || null,
                    tenantId: tenantId,
                    createdById: userId,
                    updatedById: userId,
                }
            });
        }

        const transactionResult = await tenantDb.$transaction(async (tx: any) => {
            const lowStockAlerts: Array<{name: string, quantity: number}> = [];
            
            const newTicket = await tx.ticket.create({
                data: {
                    title: ticketData.title,
                    description: ticketData.description,
                    customerId: customer!.id,
                    status: ticketData.status || 'OPEN',
                    priority: ticketData.priority || 'MEDIUM',
                    tenantId: tenantId,
                    deviceType: ticketData.deviceType,
                    deviceModel: ticketData.deviceModel,
                    serialNumber: ticketData.serialNumber,
                    accessories: ticketData.accessories,
                    checkInNotes: ticketData.checkInNotes,
                    createdById: userId,
                    updatedById: userId,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                }
            });

            await tx.auditLog.create({
                data: {
                    action: 'TICKET_CREATED',
                    module: 'TICKETS',
                    details: JSON.stringify({ id: newTicket.id, title: newTicket.title }),
                    userId,
                    entityType: 'Ticket',
                    entityId: newTicket.id,
                }
            });

            if (ticketData.initialParts && ticketData.initialParts.length > 0) {
                for (const partItem of ticketData.initialParts) {
                    const part = await tx.part.findUnique({ where: { id: partItem.partId } });

                    if (!part) {
                        throw new Error(`Repuesto no encontrado: ${partItem.partId}`);
                    }
                    if (part.tenantId !== tenantId) {
                        throw new Error('No autorizado');
                    }
                    if (part.quantity < partItem.quantity) {
                        throw new Error(`Stock insuficiente para '${part.name}'. Disponibles: ${part.quantity}, Solicitados: ${partItem.quantity}`);
                    }

                    await tx.partUsage.create({
                        data: {
                            ticketId: newTicket.id,
                            partId: partItem.partId,
                            quantity: partItem.quantity,
                            approved: true,
                            priceAtProposal: part.price,
                        },
                    });



                    if (part.quantity - partItem.quantity <= part.minStock) {
                        lowStockAlerts.push({ name: part.name, quantity: part.quantity - partItem.quantity });
                    }
                }
            }

            return { ticket: newTicket, lowStockAlerts };
        });

        const { ticket: createdTicket, lowStockAlerts: alerts } = transactionResult;

        if (alerts.length > 0) {
            Promise.all(alerts.map(async (alert: { name: string; quantity: number }) => {
                try {
                    await notifyLowStock(alert.name, alert.quantity, tenantId);
                } catch (e) {
                    console.error(`Failed to notify low stock for ${alert.name}`, e);
                }
            })).catch(err => console.error('Error processing low stock alerts', err));
        }

        try {
            await notifyTicketCreated({
                id: createdTicket.id,
                ticketNumber: createdTicket.ticketNumber || createdTicket.id.slice(0, 8),
                title: createdTicket.title,
                status: createdTicket.status,
                tenantId: createdTicket.tenantId,
                customerId: createdTicket.customerId,
                deviceType: createdTicket.deviceType,
                deviceModel: createdTicket.deviceModel,
                assignedToId: createdTicket.assignedToId,
                customer: {
                    id: createdTicket.customer.id,
                    name: createdTicket.customer.name,
                    email: createdTicket.customer.email,
                },
                assignedTo: createdTicket.assignedTo ? {
                    name: createdTicket.assignedTo.name,
                    email: createdTicket.assignedTo.email
                } : null,
            });
        } catch (e) {
            console.error('Error sending ticket created notification:', e);
        }

        return createdTicket;
    }
}
