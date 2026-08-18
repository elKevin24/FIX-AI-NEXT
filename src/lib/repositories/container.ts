import { ICustomerRepository } from './interfaces/customer.repository.interface';
import { ITicketRepository } from './interfaces/ticket.repository.interface';
import { IPartRepository } from './interfaces/part.repository.interface';
import { IUserRepository } from './interfaces/user.repository.interface';
import { IInvoiceRepository } from './interfaces/invoice.repository.interface';
import { ICashRegisterRepository } from './interfaces/cash-register.repository.interface';
import { PrismaCustomerRepository } from './implementations/prisma-customer.repository';
import { PrismaTicketRepository } from './implementations/prisma-ticket.repository';
import { PrismaPartRepository } from './implementations/prisma-part.repository';
import { PrismaUserRepository } from './implementations/prisma-user.repository';
import { PrismaInvoiceRepository } from './implementations/prisma-invoice.repository';
import { PrismaCashRegisterRepository } from './implementations/prisma-cash-register.repository';

export interface RepositoryContainer {
    customer: ICustomerRepository;
    ticket: ITicketRepository;
    part: IPartRepository;
    user: IUserRepository;
    invoice: IInvoiceRepository;
    cashRegister: ICashRegisterRepository;
}

let container: RepositoryContainer | null = null;

export function createRepositoryContainer(tenantId: string, userId: string): RepositoryContainer {
    return {
        customer: new PrismaCustomerRepository(tenantId, userId),
        ticket: new PrismaTicketRepository(tenantId, userId),
        part: new PrismaPartRepository(tenantId, userId),
        user: new PrismaUserRepository(tenantId, userId),
        invoice: new PrismaInvoiceRepository(tenantId, userId),
        cashRegister: new PrismaCashRegisterRepository(tenantId, userId),
    };
}

export function getRepositoryContainer(tenantId: string, userId: string): RepositoryContainer {
    if (!container) {
        container = createRepositoryContainer(tenantId, userId);
    }
    return container;
}

export function clearRepositoryContainer() {
    container = null;
}