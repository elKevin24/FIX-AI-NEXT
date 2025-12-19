import { prisma } from "./prisma";

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
                async findMany({ args, query }: any) {
                    args.where = { ...args.where, tenantId };
                    return query(args);
                },
                async findFirst({ args, query }: any) {
                    args.where = { ...args.where, tenantId };
                    return query(args);
                },
                async findUnique({ args, query, model }: any) {
                    const { where, ...rest } = args;
                    return (prisma as any)[model].findFirst({
                        where: { ...where, tenantId },
                        ...rest,
                    });
                },
                async create({ args, query, model }: any) {
                    (args.data as any).tenantId = tenantId;
                    if (userId) {
                        (args.data as any).createdById = userId;
                        (args.data as any).updatedById = userId;
                    }
                    
                    const result = await query(args);

                    // Automatic Audit Log
                    if (userId && model !== 'AuditLog') {
                        try {
                            // Run properly detached to not block response
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
                    
                    const result = await query(args);

                    // Audit Log for Batch Create
                    if (userId && model !== 'AuditLog') {
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
                    const { where, ...rest } = args;
                    
                    // 1. Verify ownership and get previous state (for diffing if needed, or ensuring existence)
                    const record = await (prisma as any)[model].findFirst({
                        where: { ...where, tenantId },
                        select: { id: true } 
                    });

                    if (!record) {
                        const error = new Error('Record to update not found.');
                        (error as any).code = 'P2025';
                        throw error;
                    }

                    // 2. Add metadata
                    if (userId && args.data) {
                        args.data.updatedById = userId;
                    }

                    // 3. Perform Update
                    const result = await query(args);

                    // 4. Audit Log
                    if (userId && model !== 'AuditLog') {
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
                    const { where, ...rest } = args;
                    const record = await (prisma as any)[model].findFirst({
                        where: { ...where, tenantId },
                        select: { id: true }
                    });

                    if (!record) {
                        const error = new Error('Record to delete not found.');
                        (error as any).code = 'P2025';
                        throw error;
                    }

                    const result = await query(args);

                    if (userId && model !== 'AuditLog') {
                         (prisma as any).auditLog.create({
                            data: {
                                action: `DELETE_${model.toUpperCase()}`,
                                details: JSON.stringify({ 
                                    id: record.id, 
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
