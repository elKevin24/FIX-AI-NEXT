import { Part, PrismaClient } from '@prisma/client';
import { IPartRepository } from './domain.repositories';
import { getTenantPrisma } from '../tenant-prisma';

export class PrismaPartRepository implements IPartRepository {
    private db: PrismaClient;

    constructor(tenantId: string, userId?: string) {
        this.db = getTenantPrisma(tenantId, userId);
    }

    async findById(id: string): Promise<Part | null> {
        return await this.db.part.findUnique({
            where: { id }
        });
    }

    async findByIdWithUsages(id: string): Promise<(Part & { usages: { id: string }[] }) | null> {
        return await this.db.part.findUnique({
            where: { id },
            include: {
                usages: { select: { id: true } }
            }
        }) as (Part & { usages: { id: string }[] }) | null;
    }

    async findMany(filter?: any): Promise<Part[]> {
        return await this.db.part.findMany(filter);
    }

    async create(data: any): Promise<Part> {
        return await this.db.part.create({ data });
    }

    async update(id: string, data: any): Promise<Part> {
        return await this.db.part.update({
            where: { id },
            data
        });
    }

    async delete(id: string): Promise<Part> {
        return await this.db.part.delete({
            where: { id }
        });
    }
}
