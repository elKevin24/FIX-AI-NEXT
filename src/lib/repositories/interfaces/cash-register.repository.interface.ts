import { CashRegister, CashTransaction } from '@prisma/client';

export interface ICashRegisterRepository {
    findById(id: string): Promise<CashRegister | null>;
    findByIdWithTransactions(id: string): Promise<any | null>;
    findFirst(filter?: any): Promise<CashRegister | null>;
    findMany(filter?: any): Promise<CashRegister[]>;
    create(data: any): Promise<CashRegister>;
    update(id: string, data: any): Promise<CashRegister>;
    delete(id: string): Promise<CashRegister>;
    count(filter?: any): Promise<number>;
}

export interface CashRegisterFilters {
    tenantId: string;
    isOpen?: boolean;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CashRegisterWithRelations extends CashRegister {
    transactions?: CashTransaction[];
    openedBy?: { id: string; name?: string | null; email?: string | null } | null;
    closedBy?: { id: string; name?: string | null; email?: string | null } | null;
}
