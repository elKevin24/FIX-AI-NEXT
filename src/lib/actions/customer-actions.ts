'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect } from 'next/navigation';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/schemas';

/**
 * Create a new customer (Server Action)
 */
export async function createCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden crear clientes' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = CreateCustomerSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, email, phone, address, dpi, nit } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        await tenantDb.customer.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                dpi: dpi || null,
                nit: nit || null,
                tenantId: session.user.tenantId,
                createdById: session.user.id,
                updatedById: session.user.id,
            }
        });

    } catch (error) {
        console.error('Failed to create customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo crear el cliente.' };
    }

    redirect('/dashboard/customers');
}

/**
 * Update an existing customer (Server Action)
 */
export async function updateCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (session.user.role === 'VIEWER') {
        return { success: false, message: 'Los observadores no pueden editar clientes' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = UpdateCustomerSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { customerId, name, email, phone, address, dpi, nit } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: customerId }
        });

        if (!existingCustomer) {
            return { success: false, message: 'Cliente no encontrado' };
        }

        await tenantDb.customer.update({
            where: { id: customerId },
            data: {
                name,
                email: email || null,
                phone: phone || null,
                address: address || null,
                dpi: dpi || null,
                nit: nit || null,
                updatedById: session.user.id,
            },
        });

    } catch (error) {
        console.error('Failed to update customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el cliente.' };
    }

    redirect('/dashboard/customers');
}

/**
 * Delete a customer (Server Action)
 */
export async function deleteCustomer(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar clientes' };
    }

    const customerId = formData.get('customerId') as string;

    if (!customerId) {
        return { success: false, message: 'ID de cliente requerido' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingCustomer = await tenantDb.customer.findUnique({
            where: { id: customerId },
            include: {
                tickets: {
                    select: { id: true }
                }
            }
        });

        if (!existingCustomer) {
            return { success: false, message: 'Cliente no encontrado' };
        }

        if (existingCustomer.tickets.length > 0) {
            return { success: false, message: `No se puede eliminar: el cliente tiene ${existingCustomer.tickets.length} ticket(s) asociado(s)` };
        }

        await tenantDb.customer.delete({
            where: { id: customerId },
        });

    } catch (error) {
        console.error('Failed to delete customer:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el cliente.' };
    }

    redirect('/dashboard/customers');
}
