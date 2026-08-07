import { prisma } from "./prisma";

const MODELS_WITH_TENANT = [
    'user', 'customer', 'ticket', 'part', 'purchaseOrder',
    'auditLog', 'serviceTemplate', 'notification', 'invoice',
    'payment', 'cashRegister', 'cashTransaction', 'tenantSettings',
    'pOSSale', 'pOSQuotation', 'creditNote'
] as const;

const MODELS_WITH_CREATED_BY = [
    'user', 'customer', 'ticket', 'part', 'purchaseOrder',
    'serviceTemplate', 'invoice', 'cashTransaction',
    'pOSSale', 'pOSQuotation', 'creditNote'
] as const;

const MODELS_WITH_UPDATED_BY = [
    'user', 'customer', 'ticket', 'part', 'purchaseOrder',
    'serviceTemplate', 'invoice'
] as const;

type ModelName = typeof MODELS_WITH_TENANT[number];

function hasTenantId(model: string): model is ModelName {
    return MODELS_WITH_TENANT.includes(model as ModelName);
}

function hasCreatedBy(model: ModelName): boolean {
    return (MODELS_WITH_CREATED_BY as readonly string[]).includes(model);
}

function hasUpdatedBy(model: ModelName): boolean {
    return (MODELS_WITH_UPDATED_BY as readonly string[]).includes(model);
}

function addTenantId(data: Record<string, unknown>, tenantId: string): void {
    data.tenantId = tenantId;
}

function addAuditFields(data: Record<string, unknown>, userId: string, model: ModelName): void {
    if (hasCreatedBy(model)) {
        data.createdById = userId;
    }
    if (hasUpdatedBy(model)) {
        data.updatedById = userId;
    }
}

async function verifyOwnership(
    model: ModelName,
    args: { where?: Record<string, unknown> },
    tenantId: string
): Promise<void> {
    const { where } = args;
    const record = await (prisma[model] as any).findFirst({
        where: { ...where, tenantId },
        select: { id: true }
    });

    if (!record) {
        const error = new Error('Record not found or unauthorized.');
        (error as any).code = 'P2025';
        throw error;
    }
}

export function getTenantPrisma(tenantId: string, userId?: string) {
    if (!tenantId) {
        throw new Error('tenantId es requerido para aislar la base de datos');
    }
    if (userId !== undefined && !userId) {
        throw new Error('userId es requerido para la auditoría');
    }

    return prisma.$extends({
        query: {
            $allModels: {
                async findMany({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findFirst({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findUnique({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        const { where, ...rest } = args;
                        return (prisma[model] as any).findFirst({
                            where: { ...where, tenantId },
                            ...rest,
                        });
                    }
                    return query(args);
                },
                async create({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        addTenantId(args.data, tenantId);
                        if (userId) {
                            addAuditFields(args.data, userId, model);
                        }
                    }
                    return query(args);
                },
                async createMany({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        if (Array.isArray(args.data)) {
                            args.data = args.data.map((item: Record<string, unknown>) => {
                                const enriched = { ...item };
                                addTenantId(enriched, tenantId);
                                if (userId) {
                                    addAuditFields(enriched, userId, model);
                                }
                                return enriched;
                            });
                        } else {
                            addTenantId(args.data, tenantId);
                            if (userId) {
                                addAuditFields(args.data, userId, model);
                            }
                        }
                    }
                    return query(args);
                },
                async update({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        await verifyOwnership(model, args, tenantId);
                        if (userId && args.data && hasUpdatedBy(model)) {
                            args.data.updatedById = userId;
                        }
                    }
                    return query(args);
                },
                async delete({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        await verifyOwnership(model, args, tenantId);
                    }
                    return query(args);
                },
                async count({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async aggregate({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async groupBy({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async updateMany({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                        if (userId && args.data && hasUpdatedBy(model)) {
                            args.data.updatedById = userId;
                        }
                    }
                    return query(args);
                },
                async deleteMany({ args, query, model }: any) {
                    if (hasTenantId(model)) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
            },
        },
    });
}