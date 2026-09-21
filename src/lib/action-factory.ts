import {
    ICustomerRepository,
    IPartRepository,
    IUserRepository,
    ITicketRepository,
    IInvoiceRepository,
    ICashRegisterRepository,
    IAuditLogRepository,
    PrismaCustomerRepository,
    PrismaPartRepository,
    PrismaUserRepository,
    PrismaTicketRepository,
    PrismaInvoiceRepository,
    PrismaCashRegisterRepository,
    PrismaAuditLogRepository,
} from './repositories';

export interface ActionRepositories {
    customerRepo: ICustomerRepository;
    partRepo: IPartRepository;
    userRepo: IUserRepository;
    ticketRepo: ITicketRepository;
    invoiceRepo: IInvoiceRepository;
    cashRegisterRepo: ICashRegisterRepository;
    auditLogRepo: IAuditLogRepository;
}

/**
 * Factory to create repository instances for a given tenant and user context.
 * Enables dependency injection and simplified testing without tight coupling to Prisma.
 */
export function createActionRepositories(tenantId: string, userId?: string): ActionRepositories {
    const safeUserId = userId ?? '';
    return {
        customerRepo: new PrismaCustomerRepository(tenantId, safeUserId),
        partRepo: new PrismaPartRepository(tenantId, safeUserId),
        userRepo: new PrismaUserRepository(tenantId, safeUserId),
        ticketRepo: new PrismaTicketRepository(tenantId, safeUserId),
        invoiceRepo: new PrismaInvoiceRepository(tenantId, safeUserId),
        cashRegisterRepo: new PrismaCashRegisterRepository(tenantId, safeUserId),
        auditLogRepo: new PrismaAuditLogRepository(tenantId),
    };
}
