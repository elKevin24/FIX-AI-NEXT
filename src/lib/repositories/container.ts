import { ICustomerRepository } from './interfaces/customer.repository.interface';
import { ITicketRepository } from './interfaces/ticket.repository.interface';
import { IPartRepository } from './interfaces/part.repository.interface';
import { IUserRepository } from './interfaces/user.repository.interface';
import { PrismaCustomerRepository } from './implementations/prisma-customer.repository';
import { PrismaTicketRepository } from './implementations/prisma-ticket.repository';
import { PrismaPartRepository } from './implementations/prisma-part.repository';
import { PrismaUserRepository } from './implementations/prisma-user.repository';

export interface RepositoryContainer {
    customer: ICustomerRepository;
    ticket: ITicketRepository;
    part: IPartRepository;
    user: IUserRepository;
}

const containerCache = new Map<string, RepositoryContainer>();

export function createRepositoryContainer(tenantId: string, userId: string): RepositoryContainer {
    return {
        customer: new PrismaCustomerRepository(tenantId, userId),
        ticket: new PrismaTicketRepository(tenantId, userId),
        part: new PrismaPartRepository(tenantId, userId),
        user: new PrismaUserRepository(tenantId, userId),
    };
}

export function getRepositoryContainer(tenantId: string, userId: string): RepositoryContainer {
    const key = `${tenantId}:${userId}`;
    let instance = containerCache.get(key);
    if (!instance) {
        instance = createRepositoryContainer(tenantId, userId);
        containerCache.set(key, instance);
    }
    return instance;
}

export function clearRepositoryContainer() {
    containerCache.clear();
}