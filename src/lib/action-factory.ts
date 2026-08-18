import {
    ICustomerRepository,
    IPartRepository,
    IUserRepository,
    ITicketRepository,
    IInvoiceRepository,
    ICashRegisterRepository,
    PrismaCustomerRepository,
    PrismaPartRepository,
    PrismaUserRepository,
    PrismaTicketRepository,
    PrismaInvoiceRepository,
    PrismaCashRegisterRepository,
} from './repositories';

export interface ActionRepositories {
    customerRepo: ICustomerRepository;
    partRepo: IPartRepository;
    userRepo: IUserRepository;
    ticketRepo: ITicketRepository;
    invoiceRepo: IInvoiceRepository;
    cashRegisterRepo: ICashRegisterRepository;
}

/**
 * Factory to create repository instances for a given tenant and user context.
 * Enables dependency injection and simplified testing without tight coupling to Prisma.
 */
export function createActionRepositories(tenantId: string, userId?: string): ActionRepositories {
    return {
        customerRepo: new PrismaCustomerRepository(tenantId, userId),
        partRepo: new PrismaPartRepository(tenantId, userId),
        userRepo: new PrismaUserRepository(tenantId, userId),
        ticketRepo: new PrismaTicketRepository(tenantId, userId),
        invoiceRepo: new PrismaInvoiceRepository(tenantId, userId),
        cashRegisterRepo: new PrismaCashRegisterRepository(tenantId, userId),
    };
}
