import { prisma } from "./prisma";

/**
 * List of models that have a tenantId field and should be scoped.
 */
const MODELS_WITH_TENANT = [
    'User',
    'Customer',
    'Ticket',
    'Part',
    'PurchaseOrder',
    'AuditLog',
    'ServiceTemplate',
    'Notification',
    'Invoice',
    'Payment',
    'CashRegister',
    'CashTransaction',
    'TenantSettings',
    'POSSale',
    'POSQuotation',
    'CreditNote'
];

/**
 * Models that have a `createdById` field usable for audit trail.
 */
const MODELS_WITH_CREATED_BY = [
    'User', 'Customer', 'Ticket', 'Part', 'PurchaseOrder',
    'ServiceTemplate', 'Invoice', 'CashTransaction',
    'POSSale', 'POSQuotation', 'CreditNote'
];

/**
 * Models that have an `updatedById` field usable for audit trail.
 */
const MODELS_WITH_UPDATED_BY = [
    'User', 'Customer', 'Ticket', 'Part', 'PurchaseOrder',
    'ServiceTemplate', 'Invoice'
];

/**
 * Returns a Prisma client extension that enforces tenant isolation.
 * 
 * @param tenantId The ID of the tenant to scope queries to.
 * @returns A tenant-scoped Prisma client.
 */
export function getTenantPrisma(tenantId: string, userId?: string, clientArg: any = prisma) {
    if (!tenantId) {
        throw new Error('tenantId es requerido para aislar la base de datos');
    }
    if (userId !== undefined && !userId) {
        throw new Error('userId es requerido para la auditoría');
    }

    return clientArg.$extends({
        query: {
            $allModels: {
                async findMany({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findFirst({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findUnique({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        const { where, ...rest } = args;
                        // findUnique doesn't support additional filters in 'where' easily without
                        // unique constraints, so we convert to findFirst.
                        return (prisma as any)[model].findFirst({
                            where: { ...where, tenantId },
                            ...rest,
                        });
                    }
                    return query(args);
                },
                async create({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        (args.data as any).tenantId = tenantId;
                        if (userId) {
                            if (MODELS_WITH_CREATED_BY.includes(model)) {
                                (args.data as any).createdById = userId;
                            }
                            if (MODELS_WITH_UPDATED_BY.includes(model)) {
                                (args.data as any).updatedById = userId;
                            }
                        }
                    }
                    
                    const result = await query(args);
                    return result;
                },
                async createMany({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        if (Array.isArray(args.data)) {
                            args.data = args.data.map((item: any) => {
                                const enriched: any = { ...item, tenantId };
                                if (userId) {
                                    if (MODELS_WITH_CREATED_BY.includes(model)) {
                                        enriched.createdById = userId;
                                    }
                                    if (MODELS_WITH_UPDATED_BY.includes(model)) {
                                        enriched.updatedById = userId;
                                    }
                                }
                                return enriched;
                            });
                        } else {
                            (args.data as any).tenantId = tenantId;
                            if (userId) {
                                if (MODELS_WITH_CREATED_BY.includes(model)) {
                                    (args.data as any).createdById = userId;
                                }
                                if (MODELS_WITH_UPDATED_BY.includes(model)) {
                                    (args.data as any).updatedById = userId;
                                }
                            }
                        }
                    }
                    
                    const result = await query(args);
                    return result;
                },
                async update({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        const { where } = args;
                        
                        // 1. Verify ownership
                        const record = await (prisma as any)[model].findFirst({
                            where: { ...where, tenantId },
                            select: { id: true } 
                        });

                        if (!record) {
                            const error = new Error('Record to update not found or unauthorized.');
                            (error as any).code = 'P2025';
                            throw error;
                        }

                        // 2. Add metadata
                        if (userId && args.data && MODELS_WITH_UPDATED_BY.includes(model)) {
                            args.data.updatedById = userId;
                        }
                    }

                    // 3. Perform Update
                    const result = await query(args);
                    return result;
                },
                async delete({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        const { where } = args;
                        const record = await (prisma as any)[model].findFirst({
                            where: { ...where, tenantId },
                            select: { id: true }
                        });

                        if (!record) {
                            const error = new Error('Record to delete not found or unauthorized.');
                            (error as any).code = 'P2025';
                            throw error;
                        }
                    }

                    const result = await query(args);
                    return result;
                },
                async count({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async aggregate({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async groupBy({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async updateMany({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                        if (userId && args.data && MODELS_WITH_UPDATED_BY.includes(model)) {
                            args.data.updatedById = userId;
                        }
                    }
                    return query(args);
                },
                async deleteMany({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
            },
        },
    });
}