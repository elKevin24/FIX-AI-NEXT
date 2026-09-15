export type { EventHandler, DomainEvent, EventEmitter } from './event-emitter';
export { InMemoryEventEmitter, eventEmitter } from './event-emitter';

export { 
    registerNotificationHandlers,
    emitTicketCreated,
    emitTicketStatusChanged,
    emitTechnicianAssigned,
    emitPartsApprovalRequired,
    emitLowStock,
} from './notification-handlers';

export type { 
    TicketCreatedEvent,
    TicketStatusChangedEvent,
    TechnicianAssignedEvent,
    PartsApprovalRequiredEvent,
    LowStockEvent,
    NotificationEventTypes
} from './notification-events';