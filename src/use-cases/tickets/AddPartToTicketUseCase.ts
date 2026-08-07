import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { notifyPartsApprovalRequired } from '@/lib/ticket-notifications';

export interface AddPartToTicketParams {
    ticketId: string;
    partId: string;
    quantity: number;
    tenantId: string;
    userId: string;
    email?: string | null;
}

export class AddPartToTicketUseCase {
    static async execute({ ticketId, partId, quantity, tenantId, userId, email }: AddPartToTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const superAdmin = isSuperAdmin({ id: userId, email });

        const result = await tenantDb.$transaction(async (tx: any) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: ticketId },
                include: { customer: true },
            });

            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (!superAdmin && ticket.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            const part = await tx.part.findUnique({ where: { id: partId } });

            if (!part) {
                throw new Error('Repuesto no encontrado');
            }

            if (!superAdmin && part.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            // El repuesto se propone pendiente de aprobación: aún NO descuenta stock.
            // El trigger de inventario descuenta solo cuando approved pasa a true.
            const usage = await tx.partUsage.create({
                data: {
                    ticketId,
                    partId,
                    quantity,
                    approved: false,
                    priceAtProposal: part.price,
                }
            });

            await tx.auditLog.create({
                data: {
                    action: 'TICKET_UPDATED',
                    module: 'TICKETS',
                    details: JSON.stringify({ ticketId, partId, quantity, type: 'PART_ADDED', approved: false, priceAtProposal: Number(part.price) }),
                    userId,
                    entityType: 'Ticket',
                    entityId: ticketId,
                }
            });

            // Un repuesto propuesto pone el ticket en espera de aprobación del cliente.
            if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_FOR_PARTS' || ticket.status === 'WAITING_APPROVAL') {
                await tx.ticket.update({
                    where: { id: ticketId, tenantId: ticket.tenantId },
                    data: { status: 'WAITING_APPROVAL', updatedById: userId },
                });
            }

            return { usage, ticket, part };
        });

        try {
            await notifyPartsApprovalRequired(
                {
                    id: result.ticket.id,
                    ticketNumber: result.ticket.ticketNumber,
                    title: result.ticket.title,
                    status: result.ticket.status,
                    tenantId: result.ticket.tenantId,
                    customerId: result.ticket.customerId,
                    assignedToId: result.ticket.assignedToId,
                    customer: {
                        id: result.ticket.customer?.id,
                        name: result.ticket.customer?.name || 'Cliente',
                        email: result.ticket.customer?.email,
                    },
                },
                {
                    id: result.part.id,
                    name: result.part.name,
                    sku: result.part.sku,
                },
                quantity,
                Number(result.part.price),
                Number(result.part.price) * quantity,
            );
        } catch (e) {
            console.error('Failed to notify parts approval required:', e);
        }

        return result.usage;
    }
}
