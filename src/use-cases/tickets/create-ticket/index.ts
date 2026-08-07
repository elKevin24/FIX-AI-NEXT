export { CustomerResolver, type CustomerInfo, type ResolvedCustomer } from './CustomerResolver';
export { TicketCreator, type TicketCreationData, type CreatedTicket, type ResolvedCustomer as TicketResolvedCustomer, type AssignedTo } from './TicketCreator';
export { PartUsageHandler, type PartItem, type LowStockAlert } from './PartUsageHandler';
export { AuditLogger, type AuditLogData } from './AuditLogger';
export { NotificationDispatcher, type TicketNotificationData, type LowStockAlert as NotificationLowStockAlert } from './NotificationDispatcher';
export { CreateTicketUseCase, type CreateTicketParams, type CreatedTicketResult } from './CreateTicketUseCase';