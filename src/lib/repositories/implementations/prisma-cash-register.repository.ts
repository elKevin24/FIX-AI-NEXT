import { getTenantPrisma } from '@/lib/tenant-prisma';
import { ICashRegisterRepository } from '../interfaces/cash-register.repository.interface';

export class PrismaCashRegisterRepository implements ICashRegisterRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string = ''
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string) {
        return this.db.cashRegister.findUnique({ where: { id } });
    }

    async findByIdWithTransactions(id: string) {
        return this.db.cashRegister.findUnique({
            where: { id },
            include: { transactions: true },
        });
    }

    async findFirst(filter?: any) {
        return this.db.cashRegister.findFirst(filter);
    }

    async findMany(filter?: any) {
        return this.db.cashRegister.findMany(filter);
    }

    async create(data: any) {
        return this.db.cashRegister.create({ data });
    }

    async update(id: string, data: any) {
        return this.db.cashRegister.update({ where: { id }, data });
    }

    async delete(id: string) {
        return this.db.cashRegister.delete({ where: { id } });
    }

    async count(filter?: any) {
        return this.db.cashRegister.count(filter);
    }
}
