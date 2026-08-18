import { Customer, PrismaClient } from '@prisma/client';
import { ICustomerRepository } from './domain.repositories';
import { getTenantPrisma } from '../tenant-prisma';

export class PrismaCustomerRepository implements ICustomerRepository {
    private db: PrismaClient;

    constructor(tenantId: string, userId?: string) {
        this.db = getTenantPrisma(tenantId, userId);
    }

    async findById(id: string): Promise<Customer | null> {
        return await this.db.customer.findUnique({
            where: { id }
        });
    }

    async findByIdWithTickets(id: string): Promise<(Customer & { tickets: { id: string }[] }) | null> {
        return await this.db.customer.findUnique({
            where: { id },
            include: {
                tickets: { select: { id: true } }
            }
        }) as (Customer & { tickets: { id: string }[] }) | null;
    }

    async findFirst(filter?: any): Promise<Customer | null> {
        return await this.db.customer.findFirst(filter);
    }

    async findMany(filter?: any): Promise<Customer[]> {
        return await this.db.customer.findMany(filter);
    }

    async create(data: any): Promise<Customer> {
        return await this.db.customer.create({ data });
    }

    async update(id: string, data: any): Promise<Customer> {
        return await this.db.customer.update({
            where: { id },
            data
        });
    }

    async delete(id: string): Promise<Customer> {
        return await this.db.customer.delete({
            where: { id }
        });
    }
}
