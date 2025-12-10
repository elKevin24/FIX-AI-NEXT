import { prisma } from "./prisma";

/**
 * Returns a Prisma client extension that enforces tenant isolation.
 * 
 * @param tenantId The ID of the tenant to scope queries to.
 * @returns A tenant-scoped Prisma client.
 */
export function getTenantPrisma(tenantId: string) {
    return prisma.$extends({
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
                    // findUnique cannot easily be patched to include tenantId if it's not in the unique key.
                    // We convert it to findFirst to enforce tenant isolation.
                    // This works because we want to find a record that matches the unique criteria AND the tenantId.
                    const { where, ...rest } = args;
                    return (prisma as any)[model].findFirst({
                        where: { ...where, tenantId },
                        ...rest,
                    });
                },
                async create({ args, query }: any) {
                    (args.data as any).tenantId = tenantId;
                    return query(args);
                },
                async createMany({ args, query }: any) {
                    if (Array.isArray(args.data)) {
                        args.data = args.data.map((item: any) => ({ ...item, tenantId }));
                    } else {
                        (args.data as any).tenantId = tenantId;
                    }
                    return query(args);
                },
                async update({ args, query, model }: any) {
                    // Similar to findUnique, update takes a unique 'where'. 
                    // We can't easily inject tenantId into 'where' for update if it's not part of the unique constraint.
                    // We use updateMany to enforce the check, ensuring we only update 1 record.
                    const { where, ...rest } = args;
                    // We use updateMany but we expect it to affect at most 1 record.
                    // However, update returns the object, updateMany returns count.
                    // So we might need to findFirst then update? 
                    // Or just use updateMany and return the count?
                    // Standard Prisma update returns the record.

                    // Strategy: Find the record first ensuring tenantId, then update it.
                    // This ensures we don't update something we don't own.
                    const record = await (prisma as any)[model].findFirst({
                        where: { ...where, tenantId },
                        select: { id: true } // Assuming all models have 'id' or we need to know the PK
                    });

                    if (!record) {
                        // If not found in this tenant, we throw or return null depending on expected behavior.
                        // Prisma update throws RecordNotFound if not found.
                        const error = new Error('Record to update not found.');
                        (error as any).code = 'P2025';
                        throw error;
                    }

                    // Now we can safely update by ID (which we know belongs to tenant)
                    // Or just proceed with the original update since we verified ownership?
                    // No, we should still be careful.
                    return query(args);
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

                    return query(args);
                },
            },
        },
    });
}
