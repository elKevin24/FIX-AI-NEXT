import 'server-only';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import {
    IServiceTemplateRepository,
    ServiceTemplateFilters,
    ServiceTemplateCreateInput,
    ServiceTemplateUpdateInput,
} from '../interfaces/service-template.repository.interface';
import { Prisma } from '@prisma/client';

export class PrismaServiceTemplateRepository implements IServiceTemplateRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string = '',
        private readonly customDb?: any
    ) {}

    private get db() {
        return this.customDb ?? getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string): Promise<any | null> {
        return await this.db.serviceTemplate.findUnique({
            where: { id },
        });
    }

    async findByIdWithParts(id: string): Promise<any | null> {
        return await this.db.serviceTemplate.findUnique({
            where: { id },
            include: {
                defaultParts: {
                    include: {
                        part: true,
                    },
                },
            },
        });
    }

    async findMany(filters?: ServiceTemplateFilters): Promise<any[]> {
        const where: any = {};

        if (filters?.category) {
            where.category = filters.category;
        }

        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { defaultTitle: { contains: filters.search, mode: 'insensitive' } },
                { defaultDescription: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return await this.db.serviceTemplate.findMany({
            where,
            include: {
                defaultParts: {
                    include: {
                        part: true,
                    },
                },
                _count: {
                    select: {
                        tickets: true,
                        usages: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async create(data: ServiceTemplateCreateInput, createdById?: string): Promise<any> {
        return await this.db.serviceTemplate.create({
            data: {
                name: data.name,
                category: data.category,
                defaultTitle: data.defaultTitle,
                defaultDescription: data.defaultDescription,
                defaultPriority: data.defaultPriority ?? 'Medium',
                estimatedDuration: data.estimatedDuration,
                laborCost: data.laborCost !== undefined && data.laborCost !== null ? new Prisma.Decimal(data.laborCost) : null,
                isActive: data.isActive ?? true,
                color: data.color ?? '#3B82F6',
                icon: data.icon ?? '🔧',
                tenantId: this.tenantId,
                createdById: createdById || this.userId || undefined,
            },
        });
    }

    async update(id: string, data: ServiceTemplateUpdateInput, updatedById?: string): Promise<any> {
        const updateData: any = { ...data };
        if (data.laborCost !== undefined) {
            updateData.laborCost = data.laborCost !== null ? new Prisma.Decimal(data.laborCost) : null;
        }
        if (updatedById || this.userId) {
            updateData.updatedById = updatedById || this.userId;
        }

        return await this.db.serviceTemplate.update({
            where: { id },
            data: updateData,
        });
    }

    async delete(id: string): Promise<any> {
        return await this.db.serviceTemplate.delete({
            where: { id },
        });
    }

    async count(filters?: ServiceTemplateFilters): Promise<number> {
        const where: any = {};

        if (filters?.category) {
            where.category = filters.category;
        }

        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { defaultTitle: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return await this.db.serviceTemplate.count({ where });
    }
}
