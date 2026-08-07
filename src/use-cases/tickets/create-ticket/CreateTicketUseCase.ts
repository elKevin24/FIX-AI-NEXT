import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreateTicketInput } from '@/lib/schemas';
import { CustomerResolver, CustomerInfo, ResolvedCustomer } from './CustomerResolver';
import { TicketCreator, CreatedTicket } from './TicketCreator';
import { PartUsageHandler, PartItem, LowStockAlert } from './PartUsageHandler';
import { AuditLogger } from './AuditLogger';
import { NotificationDispatcher, TicketNotificationData } from './NotificationDispatcher';
import { NotFoundError, AuthorizationError, BusinessRuleError } from '@/lib/errors';

export interface CreateTicketParams {
    ticketData: CreateTicketInput;
    customerInfo: CustomerInfo;
    tenantId: string;
    userId: string;
}

export interface CreatedTicketResult {
    id: string;
    ticketNumber: string | null;
    title: string;
    status: string;
    tenantId: string;
    customerId: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    assignedToId?: string | null;
    customer: ResolvedCustomer;
    assignedTo: {
        name?: string | null;
        email: string;
    } | null;
    lowStockAlerts: LowStockAlert[];
}

export class CreateTicketUseCase {
    private readonly customerResolver: CustomerResolver;
    private readonly ticketCreator: TicketCreator;
    private readonly partUsageHandler: PartUsageHandler;
    private readonly auditLogger: AuditLogger;
    private readonly notificationDispatcher: NotificationDispatcher;

    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {
        this.customerResolver = new CustomerResolver(tenantId, userId);
        this.ticketCreator = new TicketCreator(tenantId, userId);
        this.partUsageHandler = new PartUsageHandler(tenantId, userId);
        this.auditLogger = new AuditLogger(tenantId, userId);
        this.notificationDispatcher = new NotificationDispatcher(tenantId);
    }

    async execute({ ticketData, customerInfo }: CreateTicketParams): Promise<CreatedTicketResult> {
        // 1. Resolve or create customer
        const customer = await this.customerResolver.resolve(customerInfo);

        // 2. Prepare ticket data with customer ID
        const ticketDataWithCustomer = {
            ...ticketData,
            customerId: customer.id,
        };

        // 3. Create ticket and process parts in transaction
        const createdTicket = await this.createTicketWithParts(ticketDataWithCustomer);

        // 4. Dispatch notifications (async, fire-and-forget)
        await this.notificationDispatcher.dispatchLowStockAlerts(createdTicket.lowStockAlerts);
        await this.notificationDispatcher.dispatchTicketCreated(createdTicket);

        return createdTicket;
    }

    // Static method for backward compatibility
    static async execute(params: CreateTicketParams): Promise<CreatedTicketResult> {
        const useCase = new CreateTicketUseCase(params.tenantId, params.userId);
        return useCase.execute(params);
    }

    private async createTicketWithParts(ticketData: CreateTicketInput & { customerId: string }): Promise<CreatedTicketResult> {
        const tenantDb = getTenantPrisma(this.tenantId, this.userId);
        
        const transactionResult = await tenantDb.$transaction(async (tx: any) => {
            // Create ticket
            const newTicket = await tx.ticket.create({
                data: {
                    title: ticketData.title,
                    description: ticketData.description,
                    customerId: ticketData.customerId,
                    status: ticketData.status || 'OPEN',
                    priority: ticketData.priority || 'MEDIUM',
                    tenantId: this.tenantId,
                    deviceType: ticketData.deviceType,
                    deviceModel: ticketData.deviceModel,
                    serialNumber: ticketData.serialNumber,
                    accessories: ticketData.accessories,
                    checkInNotes: ticketData.checkInNotes,
                    createdById: this.userId,
                    updatedById: this.userId,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'TICKET_CREATED',
                    module: 'TICKETS',
                    details: JSON.stringify({ id: newTicket.id, title: newTicket.title }),
                    userId: this.userId,
                    entityType: 'Ticket',
                    entityId: newTicket.id,
                }
            });

            // Process initial parts
            let lowStockAlerts: LowStockAlert[] = [];
            if (ticketData.initialParts && ticketData.initialParts.length > 0) {
                for (const partItem of ticketData.initialParts) {
                    const part = await tx.part.findUnique({ where: { id: partItem.partId } });

                    if (!part) {
                        throw new NotFoundError('Repuesto', partItem.partId);
                    }
                    if (part.tenantId !== this.tenantId) {
                        throw new AuthorizationError('No autorizado para acceder a este repuesto');
                    }
                    if (part.quantity < partItem.quantity) {
                        throw new BusinessRuleError(
                            `Stock insuficiente para '${part.name}'. Disponibles: ${part.quantity}, Solicitados: ${partItem.quantity}`
                        );
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
                        lowStockAlerts.push({ 
                            name: part.name, 
                            quantity: part.quantity - partItem.quantity 
                        });
                    }
                }
            }

            return { ticket: newTicket, lowStockAlerts };
        });

        // Convert to result format
        return {
            id: transactionResult.ticket.id,
            ticketNumber: transactionResult.ticket.ticketNumber,
            title: transactionResult.ticket.title,
            status: transactionResult.ticket.status,
            tenantId: transactionResult.ticket.tenantId,
            customerId: transactionResult.ticket.customerId,
            deviceType: transactionResult.ticket.deviceType,
            deviceModel: transactionResult.ticket.deviceModel,
            assignedToId: transactionResult.ticket.assignedToId,
            customer: {
                id: transactionResult.ticket.customer.id,
                name: transactionResult.ticket.customer.name,
                email: transactionResult.ticket.customer.email,
            },
            assignedTo: transactionResult.ticket.assignedTo ? {
                name: transactionResult.ticket.assignedTo.name,
                email: transactionResult.ticket.assignedTo.email,
            } : null,
            lowStockAlerts: transactionResult.lowStockAlerts,
        };
    }
}