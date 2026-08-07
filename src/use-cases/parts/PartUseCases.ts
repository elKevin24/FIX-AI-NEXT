import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreatePartInput, UpdatePartInput } from '@/lib/schemas';
import { notifyLowStock } from '@/lib/ticket-notifications';

export class CreatePartUseCase {
    static async execute(data: CreatePartInput, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        return await tenantDb.part.create({
            data: {
                name: data.name,
                sku: data.sku || null,
                quantity: data.quantity,
                cost: data.cost,
                price: data.price,
                tenantId: tenantId,
                createdById: userId,
                updatedById: userId,
            }
        });
    }
}

export class UpdatePartUseCase {
    static async execute(data: UpdatePartInput, tenantId: string, userId: string, isSuperAdmin: boolean) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const existingPart = await tenantDb.part.findUnique({
            where: { id: data.partId }
        });

        if (!existingPart) {
            throw new Error('Repuesto no encontrado');
        }

        if (!isSuperAdmin && existingPart.tenantId !== tenantId) {
            throw new Error('No autorizado para editar este repuesto');
        }

        const updatedPart = await tenantDb.part.update({
            where: { id: data.partId },
            data: {
                name: data.name,
                sku: data.sku || null,
                quantity: data.quantity,
                cost: data.cost,
                price: data.price,
                updatedById: userId,
            },
        });

        if (updatedPart.quantity <= updatedPart.minStock) {
            await notifyLowStock(updatedPart.name, updatedPart.quantity, updatedPart.tenantId);
        }

        return updatedPart;
    }
}

export class DeletePartUseCase {
    static async execute(partId: string, tenantId: string, userId: string, isSuperAdmin: boolean) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const existingPart = await tenantDb.part.findUnique({
            where: { id: partId },
            include: { usages: { select: { id: true } } }
        });

        if (!existingPart) {
            throw new Error('Repuesto no encontrado');
        }

        if (!isSuperAdmin && existingPart.tenantId !== tenantId) {
            throw new Error('No autorizado para eliminar este repuesto');
        }

        if (existingPart.usages.length > 0) {
            throw new Error(`No se puede eliminar: el repuesto tiene ${existingPart.usages.length} registro(s) de uso`);
        }

        return await tenantDb.part.delete({
            where: { id: partId },
        });
    }
}
