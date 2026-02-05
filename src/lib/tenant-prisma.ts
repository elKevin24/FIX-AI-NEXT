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
 * Returns a Prisma client extension that enforces tenant isolation.
 * 
 * @param tenantId The ID of the tenant to scope queries to.
 * @returns A tenant-scoped Prisma client.
 */
export function getTenantPrisma(tenantId: string, userId?: string, clientArg: any = prisma) {
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
                            (args.data as any).createdById = userId;
                            (args.data as any).updatedById = userId;
                        }
                    }
                    
                    const result = await query(args);

                    // Automatic Audit Log
                    if (false && userId && model !== 'AuditLog') {
                        try {
                             (prisma as any).auditLog.create({
                                data: {
                                    action: `CREATE_${model.toUpperCase()}`,
                                    details: JSON.stringify({ 
                                        id: result.id, 
                                        model,
                                        data: args.data 
                                    }),
                                    userId,
                                    tenantId
                                }
                            });
                        } catch (e) {
                            console.error('Failed to create audit log:', e);
                        }
                    }

                    return result;
                },
                async createMany({ args, query, model }: any) {
                    if (MODELS_WITH_TENANT.includes(model)) {
                        if (Array.isArray(args.data)) {
                            args.data = args.data.map((item: any) => ({ 
                                ...item, 
                                tenantId,
                                createdById: userId,
                                updatedById: userId
                            }));
                        } else {
                            (args.data as any).tenantId = tenantId;
                            if (userId) {
                                (args.data as any).createdById = userId;
                                (args.data as any).updatedById = userId;
                            }
                        }
                    }
                    
                    const result = await query(args);

                    // Audit Log for Batch Create
                    if (false && userId && model !== 'AuditLog') {
                         (prisma as any).auditLog.create({
                            data: {
                                action: `BATCH_CREATE_${model.toUpperCase()}`,
                                details: JSON.stringify({ 
                                    count: result.count, 
                                    model 
                                }),
                                userId,
                                tenantId
                            }
                        });
                    }

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
                        if (userId && args.data) {
                            args.data.updatedById = userId;
                        }
                    }

                    // 3. Perform Update
                    const result = await query(args);

                    // 4. Audit Log
                    if (false && userId && model !== 'AuditLog') {
                         (prisma as any).auditLog.create({
                            data: {
                                action: `UPDATE_${model.toUpperCase()}`,
                                details: JSON.stringify({ 
                                    id: result.id, 
                                    model,
                                    changes: args.data 
                                }),
                                userId,
                                tenantId
                            }
                        });
                    }

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

                    if (false && userId && model !== 'AuditLog') {
                         (prisma as any).auditLog.create({
                            data: {
                                action: `DELETE_${model.toUpperCase()}`,
                                details: JSON.stringify({ 
                                    id: (result as any).id || 'deleted', 
                                    model 
                                }),
                                userId,
                                tenantId
                            }
                        });
                    }

                    return result;
                },
            },
        },
    });
}