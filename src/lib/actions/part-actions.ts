'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect } from 'next/navigation';
import { CreatePartSchema, UpdatePartSchema } from '@/lib/schemas';
import { notifyLowStock } from '@/lib/ticket-notifications';

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

    const { name, sku, quantity, cost, price } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        await tenantDb.part.create({
            data: {
                name,
                sku: sku || null,
                quantity,
                cost,
                price,
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });

    } catch (error) {
        console.error('Failed to create part:', error);
        return { success: false, message: 'Error de base de datos: No se pudo crear el repuesto.' };
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

    const { partId, name, sku, quantity, cost, price } = validatedFields.data;

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingPart = await tenantDb.part.findUnique({
            where: { id: partId }
        });

        if (!existingPart) {
            return { success: false, message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para editar este repuesto' };
        }

        const updatedPart = await tenantDb.part.update({
            where: { id: partId },
            data: {
                name,
                sku: sku || null,
                quantity,
                cost,
                price,
                updatedById: session.user.id,
            },
        });

        if (updatedPart.quantity <= updatedPart.minStock) {
            const admins = await tenantDb.user.findMany({
                where: {
                    role: 'ADMIN',
                },
                select: { id: true }
            });

            const adminIds = admins.map((a: { id: string }) => a.id);
            await notifyLowStock(updatedPart.tenantId, updatedPart, adminIds);
        }

    } catch (error) {
        console.error('Failed to update part:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el repuesto.' };
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

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingPart = await tenantDb.part.findUnique({
            where: { id: partId },
            include: {
                usages: {
                    select: { id: true }
                }
            }
        });

        if (!existingPart) {
            return { success: false, message: 'Repuesto no encontrado' };
        }

        if (!isSuperAdmin && existingPart.tenantId !== session.user.tenantId) {
            return { success: false, message: 'No autorizado para eliminar este repuesto' };
        }

        if (existingPart.usages.length > 0) {
            return { success: false, message: `No se puede eliminar: el repuesto tiene ${existingPart.usages.length} registro(s) de uso` };
        }

        await tenantDb.part.delete({
            where: { id: partId },
        });

    } catch (error) {
        console.error('Failed to delete part:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el repuesto.' };
    }

    redirect('/dashboard/parts');
}
