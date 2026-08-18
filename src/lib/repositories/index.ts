export type { ICustomerRepository, CustomerCreateInput, CustomerUpdateInput } from './interfaces/customer.repository.interface';
export type { ITicketRepository, TicketFilters, TicketCreateInput, TicketUpdateInput, TicketWithRelations } from './interfaces/ticket.repository.interface';
export type { IPartRepository, PartFilters, PartCreateInput, PartUpdateInput } from './interfaces/part.repository.interface';
export type { IUserRepository, UserFilters, UserCreateInput, UserUpdateInput } from './interfaces/user.repository.interface';
export type { IInvoiceRepository } from './interfaces/invoice.repository.interface';
export type { ICashRegisterRepository } from './interfaces/cash-register.repository.interface';
export type { IAuditLogRepository } from './interfaces/audit-log.repository.interface';

export { PrismaCustomerRepository } from './implementations/prisma-customer.repository';
export { PrismaTicketRepository } from './implementations/prisma-ticket.repository';
export { PrismaPartRepository } from './implementations/prisma-part.repository';
export { PrismaUserRepository } from './implementations/prisma-user.repository';
export { PrismaInvoiceRepository } from './implementations/prisma-invoice.repository';
export { PrismaCashRegisterRepository } from './implementations/prisma-cash-register.repository';
export { PrismaAuditLogRepository } from './implementations/prisma-audit-log.repository';

export type { RepositoryContainer } from './container';
export { createRepositoryContainer, getRepositoryContainer, clearRepositoryContainer } from './container';
export { TicketStatus, TicketPriority } from './interfaces/ticket.repository.interface';
export { UserRole } from './interfaces/user.repository.interface';