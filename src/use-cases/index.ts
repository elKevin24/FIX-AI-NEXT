// Use Cases - Clean Architecture Layer
// 
// This directory contains application-level business logic organized by domain.
// Each use case represents a single, focused business transaction.
//
// Key Principles:
// - No direct Prisma imports (dependency injection only)
// - Depends on repository abstractions (interfaces)
// - Single Responsibility Principle
// - Fully testable with mock repositories
// - Framework-agnostic

export * from './invoices';
export * from './cash-register';
export * from './service-templates';
export * from './users';
export * from './quotations';
export * from './pos';
export * from './credit-notes';
export * from './reports';
export * from './tenant-settings';
export * from './audit';
export * from './customers/CustomerUseCases';
export * from './parts/PartUseCases';
export * from './tickets/CreateTicketUseCase';
export * from './tickets/CreateBatchTicketsUseCase';
export * from './tickets/UpdateTicketUseCase';
export * from './tickets/UpdateTicketStatusUseCase';
export * from './tickets/DeleteTicketUseCase';
export * from './tickets/AddTicketNoteUseCase';
export * from './tickets/DeleteTicketNoteUseCase';
export * from './tickets/AddPartToTicketUseCase';
export * from './tickets/ApproveTicketPartsUseCase';
export * from './tickets/RejectTicketPartsUseCase';
export * from './tickets/RemovePartFromTicketUseCase';
export * from './tickets/AddServiceToTicketUseCase';
export * from './tickets/RemoveServiceFromTicketUseCase';
export * from './tickets/PublicCustomerApprovalUseCase';


