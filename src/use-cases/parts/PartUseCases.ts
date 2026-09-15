import { CreatePartInput, UpdatePartInput } from '@/lib/schemas';
import { notifyLowStock } from '@/lib/ticket-notifications';
import { IPartRepository, PrismaPartRepository } from '@/lib/repositories';

export class CreatePartUseCase {
    static async execute(
        data: CreatePartInput,
        tenantId: string,
        userId: string,
        repo?: IPartRepository
    ) {
        const partRepo = repo || new PrismaPartRepository(tenantId, userId);
        return await partRepo.create({
            name: data.name,
            sku: data.sku || null,
            quantity: data.quantity,
            cost: data.cost,
            price: data.price,
            tenantId: tenantId,
            createdById: userId,
            updatedById: userId,
        });
    }
}

export class UpdatePartUseCase {
    static async execute(
        data: UpdatePartInput,
        tenantId: string,
        userId: string,
        isSuperAdmin: boolean,
        repo?: IPartRepository
    ) {
        const partRepo = repo || new PrismaPartRepository(tenantId, userId);
        const existingPart = await partRepo.findById(data.partId);

        if (!existingPart) {
            throw new Error('Repuesto no encontrado');
        }

        if (!isSuperAdmin && existingPart.tenantId !== tenantId) {
            throw new Error('No autorizado para editar este repuesto');
        }

        const updatedPart = await partRepo.update(data.partId, {
            name: data.name,
            sku: data.sku || null,
            quantity: data.quantity,
            cost: data.cost,
            price: data.price,
            updatedById: userId,
        });

        if (updatedPart.quantity <= updatedPart.minStock) {
            await notifyLowStock(updatedPart.name, updatedPart.quantity, updatedPart.tenantId);
        }

        return updatedPart;
    }
}

export class DeletePartUseCase {
    static async execute(
        partId: string,
        tenantId: string,
        userId: string,
        isSuperAdmin: boolean,
        repo?: IPartRepository
    ) {
        const partRepo = repo || new PrismaPartRepository(tenantId, userId);
        const existingPart = await partRepo.findByIdWithUsages(partId);

        if (!existingPart) {
            throw new Error('Repuesto no encontrado');
        }

        if (!isSuperAdmin && existingPart.tenantId !== tenantId) {
            throw new Error('No autorizado para eliminar este repuesto');
        }

        if (existingPart.usages && existingPart.usages.length > 0) {
            throw new Error(`No se puede eliminar: el repuesto tiene ${existingPart.usages.length} registro(s) de uso asociados`);
        }

        return await partRepo.delete(partId);
    }
}
