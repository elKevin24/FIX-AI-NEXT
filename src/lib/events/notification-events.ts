export interface TicketCreatedEvent {
    ticketId: string;
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

export interface TicketStatusChangedEvent {
    ticketId: string;
    ticketNumber: string | null;
    title: string;
    oldStatus: string;
    newStatus: string;
    note?: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    tenantId: string;
    customerId: string;
    customer: {
        id: string;
        name: string;
        email?: string | null;
    };
    assignedToId?: string | null;
    assignedTo: {
        name?: string | null;
        email: string;
    } | null;
}

export interface TechnicianAssignedEvent {
    ticketId: string;
    ticketNumber: string | null;
    title: string;
    tenantId: string;
    customerId: string;
    actorName: string;
    assignedToId: string;
    assignedTo: {
        name?: string | null;
        email: string;
    };
    customer: {
        id: string;
        name: string;
        email?: string | null;
    };
}

export interface PartsApprovalRequiredEvent {
    ticketId: string;
    ticketNumber: string | null;
    title: string;
    tenantId: string;
    part: {
        id: string;
        name: string;
        sku?: string | null;
    };
    quantity: number;
    priceAtProposal: number;
    total: number;
    customer: {
        id: string;
        name: string;
        email?: string | null;
    };
    assignedToId?: string | null;
}

export interface LowStockEvent {
    partName: string;
    currentQuantity: number;
    tenantId: string;
}

export type NotificationEventTypes = 
    | { type: 'ticket.created'; payload: TicketCreatedEvent }
    | { type: 'ticket.status_changed'; payload: TicketStatusChangedEvent }
    | { type: 'ticket.technician_assigned'; payload: TechnicianAssignedEvent }
    | { type: 'ticket.parts_approval_required'; payload: PartsApprovalRequiredEvent }
    | { type: 'inventory.low_stock'; payload: LowStockEvent };