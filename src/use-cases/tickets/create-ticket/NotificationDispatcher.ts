import { notifyLowStock, notifyTicketCreated } from '@/lib/ticket-notifications';

export interface TicketNotificationData {
    id: string;
    ticketNumber: string | null;
    title: string;
    status: string;
    tenantId: string;
    customerId: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    assignedToId?: string | null;
    customer: {
        id: string;
        name: string;
        email?: string | null;
    };
    assignedTo: {
        name?: string | null;
        email: string;
    } | null;
}

export interface LowStockAlert {
    name: string;
    quantity: number;
}

export class NotificationDispatcher {
    constructor(
        private readonly tenantId: string
    ) {}

    async dispatchLowStockAlerts(alerts: LowStockAlert[]): Promise<void> {
        if (alerts.length === 0) return;

        await Promise.all(
            alerts.map(async (alert: LowStockAlert) => {
                try {
                    await notifyLowStock(alert.name, alert.quantity, this.tenantId);
                } catch (e) {
                    console.error(`Failed to notify low stock for ${alert.name}`, e);
                }
            })
        ).catch(err => console.error('Error processing low stock alerts', err));
    }

    async dispatchTicketCreated(ticket: TicketNotificationData): Promise<void> {
        try {
            await notifyTicketCreated({
                id: ticket.id,
                ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 8),
                title: ticket.title,
                status: ticket.status,
                tenantId: ticket.tenantId,
                customerId: ticket.customerId,
                deviceType: ticket.deviceType,
                deviceModel: ticket.deviceModel,
                assignedToId: ticket.assignedToId,
                customer: ticket.customer,
                assignedTo: ticket.assignedTo,
            });
        } catch (e) {
            console.error('Error sending ticket created notification:', e);
        }
    }
}