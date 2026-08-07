'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CreatePartSchema, UpdatePartSchema } from '@/lib/schemas';
import { isSuperAdmin } from '@/lib/authz';
import { CreatePartUseCase, UpdatePartUseCase, DeletePartUseCase } from '@/use-cases/parts/PartUseCases';

/**
 * Create a new part (Server Action)
 */
export async function createPart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden crear repuestos' };
    }

    const data = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        quantity: Number(formData.get('quantity')),
        cost: Number(formData.get('cost')),
        price: Number(formData.get('price')),
    };

    const validatedFields = CreatePartSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    try {
        await CreatePartUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to create part:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo crear el repuesto.' };
    }

    redirect('/dashboard/parts');
}

/**
 * Update an existing part (Server Action)
 */
export async function updatePart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const data = {
        partId: formData.get('partId'),
        name: formData.get('name'),
        sku: formData.get('sku'),
        quantity: Number(formData.get('quantity')),
        cost: Number(formData.get('cost')),
        price: Number(formData.get('price')),
    };

    const validatedFields = UpdatePartSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const superAdmin = isSuperAdmin(session.user);

    try {
        await UpdatePartUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id, superAdmin);
    } catch (error) {
        console.error('Failed to update part:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo actualizar el repuesto.' };
    }

    redirect('/dashboard/parts');
}

/**
 * Delete a part (Server Action)
 */
export async function deletePart(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar repuestos' };
    }

    const partId = formData.get('partId') as string;

    if (!partId) {
        return { success: false, message: 'ID de repuesto requerido' };
    }

    const superAdmin = isSuperAdmin(session.user);

    try {
        await DeletePartUseCase.execute(partId, session.user.tenantId, session.user.id, superAdmin);
    } catch (error) {
        console.error('Failed to delete part:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el repuesto.' };
    }

    redirect('/dashboard/parts');
}
