import { PrismaClient } from '@prisma/client';
import { prisma } from "./prisma";

const TENANTED_MODELS = new Set([
    'Ticket', 'Customer', 'Part', 'Invoice', 'POSSale', 'Sale', 'POSSaleItem',
    'Payment', 'Notification', 'CashTransaction', 'PurchaseOrder',
    'AuditLog', 'ServiceTemplate', 'CashRegister', 'TenantSettings',
    'POSQuotation', 'CreditNote', 'User'
]);

const MODELS_WITH_CREATED_BY = new Set([
    'User', 'Customer', 'Ticket', 'Part', 'PurchaseOrder',
    'ServiceTemplate', 'Invoice', 'CashTransaction',
    'POSSale', 'POSQuotation', 'CreditNote'
]);

const MODELS_WITH_UPDATED_BY = new Set([
    'User', 'Customer', 'Ticket', 'Part', 'PurchaseOrder',
    'ServiceTemplate', 'Invoice'
]);

function isTenantModel(model: string): boolean {
    return TENANTED_MODELS.has(model);
}

function hasCreatedBy(model: string): boolean {
    return MODELS_WITH_CREATED_BY.has(model);
}

function hasUpdatedBy(model: string): boolean {
    return MODELS_WITH_UPDATED_BY.has(model);
}

export function getTenantPrisma(tenantId: string, userId?: string): PrismaClient {
    if (!tenantId) {
        throw new Error('tenantId es requerido para aislar la base de datos');
    }
    if (userId !== undefined && !userId) {
        throw new Error('userId es requerido para la auditoría');
    }

    return prisma.$extends({
        query: {
            $allModels: {
                async findMany({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async findFirst({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async findUnique({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const { where, select, include, ...rest } = args ?? {};
                    const newArgs: any = { ...(rest ?? {}), where: { ...(where ?? {}), tenantId } };
                    if (select) newArgs.select = select;
                    if (include) newArgs.include = include;
                    return (prisma[model as keyof typeof prisma] as any).findFirst(newArgs);
                },

                async count({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async aggregate({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async groupBy({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async deleteMany({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const newArgs = { ...(args ?? {}), where: { ...(args?.where ?? {}), tenantId } };
                    return query(newArgs);
                },

                async create({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const data = { ...(args?.data ?? {}), tenantId };
                    if (userId) {
                        if (hasCreatedBy(model)) data.createdById = userId;
                        if (hasUpdatedBy(model)) data.updatedById = userId;
                    }
                    return query({ ...args, data });
                },

                async createMany({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const data = args?.data;
                    const enrichedData = Array.isArray(data)
                        ? data.map((item: any) => {
                            const enriched = { ...item, tenantId };
                            if (userId) {
                                if (hasCreatedBy(model)) enriched.createdById = userId;
                                if (hasUpdatedBy(model)) enriched.updatedById = userId;
                            }
                            return enriched;
                        })
                        : { ...data, tenantId, ...(userId && hasCreatedBy(model) && { createdById: userId }), ...(userId && hasUpdatedBy(model) && { updatedById: userId }) };
                    return query({ ...args, data: enrichedData });
                },

                async update({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const { where } = args;
                    const record = await (prisma[model as keyof typeof prisma] as any).findFirst({
                        where: { ...where, tenantId },
                        select: { id: true }
                    });
                    if (!record) {
                        const error = new Error('Record to update not found or unauthorized.');
                        (error as any).code = 'P2025';
                        throw error;
                    }
                    const data = { ...(args?.data ?? {}), updatedById: userId };
                    return query({ ...args, where, data });
                },

                async updateMany({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const where = { ...(args?.where ?? {}), tenantId };
                    const data = { ...(args?.data ?? {}), updatedById: userId };
                    return query({ ...args, where, data });
                },

                async delete({ model, args, query }: { model: string; args: any; query: any }) {
                    if (!isTenantModel(model)) return query(args);
                    const { where } = args;
                    const record = await (prisma[model as keyof typeof prisma] as any).findFirst({
                        where: { ...where, tenantId },
                        select: { id: true }
                    });
                    if (!record) {
                        const error = new Error('Record to delete not found or unauthorized.');
                        (error as any).code = 'P2025';
                        throw error;
                    }
                    return query({ ...args, where });
                },
            },
        },
    }) as unknown as PrismaClient;
}