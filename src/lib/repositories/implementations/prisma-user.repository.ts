import { getTenantPrisma } from '@/lib/tenant-prisma';
import { IUserRepository, UserFilters, UserCreateInput, UserUpdateInput } from '../interfaces/user.repository.interface';
import { UserRole } from '@prisma/client';

export class PrismaUserRepository implements IUserRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string) {
        return this.db.user.findUnique({ where: { id } });
    }

    async findByEmail(email: string, tenantId: string) {
        return this.db.user.findFirst({
            where: { email, tenantId }
        });
    }

    async findMany(filters: UserFilters) {
        const { tenantId, role, isActive, search, page = 1, limit = 20 } = filters;
        
        const where: any = { tenantId };
        if (role) where.role = role;
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        return this.db.user.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit
        });
    }

    async create(data: UserCreateInput) {
        return this.db.user.create({ data });
    }

    async update(id: string, data: UserUpdateInput) {
        const { password, ...updateData } = data;
        return this.db.user.update({
            where: { id },
            data: updateData
        });
    }

    async updateStatus(id: string, isActive: boolean) {
        return this.db.user.update({
            where: { id },
            data: { isActive }
        });
    }

    async delete(id: string) {
        return this.db.user.delete({ where: { id } });
    }

    async count(filters: UserFilters): Promise<number> {
        const { tenantId, role, isActive, search } = filters;
        
        const where: any = { tenantId };
        if (role) where.role = role;
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        return this.db.user.count({ where });
    }
}