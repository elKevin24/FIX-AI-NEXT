import { eventEmitter, type DomainEvent } from './event-emitter';
import { 
    TicketCreatedEvent, 
    TicketStatusChangedEvent, 
    TechnicianAssignedEvent,
    PartsApprovalRequiredEvent,
    LowStockEvent,
    NotificationEventTypes
} from './notification-events';
import { notifyTicketCreated, notifyTicketStatusChange, notifyTechnicianAssigned, notifyPartsApprovalRequired, notifyLowStock } from '@/lib/ticket-notifications';
import { createNotification } from '@/lib/notifications';

// Register all notification event handlers
export function registerNotificationHandlers(): void {
    // Ticket created notifications
    eventEmitter.on<DomainEvent<TicketCreatedEvent>>('ticket.created', async (event) => {
        const { payload } = event;
        
        // Send email to customer
        if (payload.customer.email) {
            try {
                await notifyTicketCreated({
                    id: payload.ticketId,
                    ticketNumber: payload.ticketNumber || payload.ticketId.slice(0, 8),
                    title: payload.title,
                    status: payload.status,
                    tenantId: payload.tenantId,
                    customerId: payload.customerId,
                    deviceType: payload.deviceType,
                    deviceModel: payload.deviceModel,
                    assignedToId: payload.assignedToId,
                    customer: payload.customer,
                    assignedTo: payload.assignedTo,
                });
            } catch (e) {
                console.error('Error sending ticket created notification:', e);
            }
        }
    });

    // Ticket status change notifications
    eventEmitter.on<DomainEvent<TicketStatusChangedEvent>>('ticket.status_changed', async (event) => {
        const { payload } = event;
        
        // Send email to customer
        if (payload.customer.email) {
            try {
                await notifyTicketStatusChange(
                    {
                        id: payload.ticketId,
                        ticketNumber: payload.ticketNumber,
                        title: payload.title,
                        status: payload.oldStatus,
                        tenantId: payload.tenantId,
                        customerId: payload.customerId,
                        deviceType: payload.deviceType,
                        deviceModel: payload.deviceModel,
                        assignedToId: payload.assignedToId,
                        customer: payload.customer,
                        assignedTo: payload.assignedTo,
                    },
                    {
                        oldStatus: payload.oldStatus,
                        newStatus: payload.newStatus,
                        note: payload.note || 'Cambio de estado',
                    }
                );
            } catch (e) {
                console.error('Error sending status change notification:', e);
            }
        }

        // In-app notification to assigned technician
        if (payload.assignedToId) {
            try {
                await createNotification({
                    userId: payload.assignedToId,
                    tenantId: payload.tenantId,
                    type: 'INFO',
                    title: 'Estado del Ticket Actualizado',
                    message: `El ticket #${payload.ticketNumber} cambió a estado ${payload.newStatus}`,
                    link: `/dashboard/tickets/${payload.ticketId}`,
                });
            } catch (e) {
                console.error('Error creating in-app notification:', e);
            }
        }
    });

    // Technician assigned notifications
    eventEmitter.on<DomainEvent<TechnicianAssignedEvent>>('ticket.technician_assigned', async (event) => {
        const { payload } = event;

        // In-app notification
        try {
            await createNotification({
                userId: payload.assignedToId,
                tenantId: payload.tenantId,
                type: 'INFO',
                title: 'Nuevo Ticket Asignado',
                message: `${payload.actorName} te ha asignado el ticket #${payload.ticketNumber}: "${payload.title}"`,
                link: `/dashboard/tickets/${payload.ticketId}`,
            });
        } catch (e) {
            console.error('Error creating in-app notification:', e);
        }

        // Email to technician
        if (payload.assignedTo?.email) {
            try {
                await notifyTechnicianAssigned({
                    id: payload.ticketId,
                    ticketNumber: payload.ticketNumber,
                    title: payload.title,
                    status: 'OPEN',
                    tenantId: payload.tenantId,
                    customerId: payload.customerId,
                    deviceType: '',
                    deviceModel: '',
                    assignedToId: payload.assignedToId,
                    customer: payload.customer,
                    assignedTo: payload.assignedTo,
                }, payload.actorName);
            } catch (e) {
                console.error('Error sending technician assigned email:', e);
            }
        }
    });

    // Parts approval required notifications
    eventEmitter.on<DomainEvent<PartsApprovalRequiredEvent>>('ticket.parts_approval_required', async (event) => {
        const { payload } = event;

        // In-app notification to technician
        if (payload.assignedToId) {
            try {
                await createNotification({
                    userId: payload.assignedToId,
                    tenantId: payload.tenantId,
                    type: 'INFO',
                    title: 'Repuestos pendientes de aprobación',
                    message: `El ticket #${payload.ticketNumber} espera la aprobación del cliente por "${payload.part.name}" (${payload.quantity} uds).`,
                    link: `/dashboard/tickets/${payload.ticketId}`,
                });
            } catch (e) {
                console.error('Error creating in-app notification:', e);
            }
        }

        // Email to customer
        if (payload.customer.email) {
            try {
                await notifyPartsApprovalRequired(
                    {
                        id: payload.ticketId,
                        ticketNumber: payload.ticketNumber,
                        title: payload.title,
                        status: '',
                        tenantId: payload.tenantId,
                        customerId: '',
                        deviceType: '',
                        deviceModel: '',
                        assignedToId: payload.assignedToId,
                        customer: payload.customer,
                        assignedTo: null,
                    },
                    payload.part,
                    payload.quantity,
                    payload.priceAtProposal,
                    payload.total,
                );
            } catch (e) {
                console.error('Error sending parts approval email:', e);
            }
        }
    });

    // Low stock notifications
    eventEmitter.on<DomainEvent<LowStockEvent>>('inventory.low_stock', async (event) => {
        const { payload } = event;

        try {
            await notifyLowStock(payload.partName, payload.currentQuantity, payload.tenantId);
        } catch (e) {
            console.error('Error sending low stock notification:', e);
        }
    });
}

// Emit helper functions
export async function emitTicketCreated(event: TicketCreatedEvent): Promise<void> {
    await eventEmitter.emit('ticket.created', event);
}

export async function emitTicketStatusChanged(event: TicketStatusChangedEvent): Promise<void> {
    await eventEmitter.emit('ticket.status_changed', event);
}

export async function emitTechnicianAssigned(event: TechnicianAssignedEvent): Promise<void> {
    await eventEmitter.emit('ticket.technician_assigned', event);
}

export async function emitPartsApprovalRequired(event: PartsApprovalRequiredEvent): Promise<void> {
    await eventEmitter.emit('ticket.parts_approval_required', event);
}

export async function emitLowStock(event: LowStockEvent): Promise<void> {
    await eventEmitter.emit('inventory.low_stock', event);
}