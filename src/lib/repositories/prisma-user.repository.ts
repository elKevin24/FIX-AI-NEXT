import { User, PrismaClient } from '@prisma/client';
import { IUserRepository } from './domain.repositories';
import { getTenantPrisma } from '../tenant-prisma';

export class PrismaUserRepository implements IUserRepository {
    private db: PrismaClient;

    constructor(tenantId: string, userId?: string) {
        this.db = getTenantPrisma(tenantId, userId);
    }

    async findById(id: string): Promise<User | null> {
        return await this.db.user.findUnique({
            where: { id }
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.db.user.findFirst({
            where: { email }
        });
    }

    async findMany(filter?: any): Promise<User[]> {
        return await this.db.user.findMany(filter);
    }

    async create(data: any): Promise<User> {
        return await this.db.user.create({ data });
    }

    async update(id: string, data: any): Promise<User> {
        return await this.db.user.update({
            where: { id },
            data
        });
    }

    async delete(id: string): Promise<User> {
        return await this.db.user.delete({
            where: { id }
        });
    }

    async count(filter?: any): Promise<number> {
        return await this.db.user.count(filter);
    }
}
