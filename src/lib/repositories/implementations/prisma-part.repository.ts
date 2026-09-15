import { getTenantPrisma } from '@/lib/tenant-prisma';
import { IPartRepository, PartFilters, PartCreateInput, PartUpdateInput } from '../interfaces/part.repository.interface';

export class PrismaPartRepository implements IPartRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string) {
        return this.db.part.findUnique({ where: { id } });
    }

    async findByIdWithUsages(id: string) {
        return this.db.part.findUnique({
            where: { id },
            include: { usages: { select: { id: true } } }
        });
    }

    async findMany(filters: PartFilters) {
        const { tenantId, search, category, lowStock, page = 1, limit = 20 } = filters;
        
        const where: any = { tenantId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) where.category = category;
        if (lowStock) {
            // Use raw SQL for comparing quantity to minStock
            return this.db.$queryRaw`
                SELECT * FROM "Part" 
                WHERE "tenantId" = ${tenantId}
                AND "quantity" <= "minStock"
                ORDER BY "name" ASC
                LIMIT ${limit} OFFSET ${(page - 1) * limit}
            ` as Promise<any[]>;
        }

        return this.db.part.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit
        });
    }

    async findLowStock(tenantId: string) {
        return this.db.$queryRaw`
            SELECT * FROM "Part" 
            WHERE "tenantId" = ${tenantId}
            AND "quantity" <= "minStock"
            ORDER BY "name" ASC
        ` as Promise<any[]>;
    }

    async create(data: PartCreateInput) {
        return this.db.part.create({ data });
    }

    async update(id: string, data: PartUpdateInput) {
        return this.db.part.update({
            where: { id },
            data
        });
    }

    async updateStock(id: string, quantityChange: number) {
        return this.db.part.update({
            where: { id },
            data: {
                quantity: { increment: quantityChange }
            }
        });
    }

    async delete(id: string) {
        return this.db.part.delete({ where: { id } });
    }
}