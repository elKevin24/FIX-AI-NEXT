import { getTenantPrisma } from '@/lib/tenant-prisma';
import { IInvoiceRepository } from '../interfaces/invoice.repository.interface';

export class PrismaInvoiceRepository implements IInvoiceRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string = ''
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string) {
        return this.db.invoice.findUnique({ where: { id } });
    }

    async findByIdWithRelations(id: string) {
        return this.db.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                ticket: true,
                payments: true,
            },
        });
    }

    async findFirst(filter?: any) {
        return this.db.invoice.findFirst(filter);
    }

    async findMany(filter?: any) {
        return this.db.invoice.findMany(filter);
    }

    async create(data: any) {
        return this.db.invoice.create({ data });
    }

    async update(id: string, data: any) {
        return this.db.invoice.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.db.invoice.delete({ where: { id } });
    }

    async count(filter?: any) {
        return this.db.invoice.count(filter);
    }
}
