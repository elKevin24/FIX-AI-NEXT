import { getTenantPrisma } from '@/lib/tenant-prisma';
import { ICustomerRepository, CustomerCreateInput, CustomerUpdateInput } from '../interfaces/customer.repository.interface';

export class PrismaCustomerRepository implements ICustomerRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string) {
        return this.db.customer.findUnique({ where: { id } });
    }

    async findByIdWithTickets(id: string) {
        return this.db.customer.findUnique({
            where: { id },
            include: { tickets: { select: { id: true } } }
        });
    }

    async findFirst(params: { where: { email?: string; phone?: string; name?: string } }) {
        return this.db.customer.findFirst({ where: params.where });
    }

    async findByEmail(email: string, tenantId: string) {
        return this.db.customer.findFirst({
            where: { email, tenantId }
        });
    }

    async findByPhone(phone: string, tenantId: string) {
        return this.db.customer.findFirst({
            where: { phone, tenantId }
        });
    }

    async findByName(name: string, tenantId: string) {
        return this.db.customer.findFirst({
            where: { name, tenantId }
        });
    }

    async create(data: CustomerCreateInput) {
        return this.db.customer.create({ data });
    }

    async update(id: string, data: CustomerUpdateInput) {
        return this.db.customer.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.db.customer.delete({ where: { id } });
    }
}