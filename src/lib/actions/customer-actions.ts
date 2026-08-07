'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/schemas';
import { CreateCustomerUseCase, UpdateCustomerUseCase, DeleteCustomerUseCase } from '@/use-cases/customers/CustomerUseCases';

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
        return { success: false, message: validatedFields.error.errors[0]?.message ?? 'Datos inválidos' };
    }

    try {
        await CreateCustomerUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to create customer:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo crear el cliente.' };
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
        return { success: false, message: validatedFields.error.errors[0]?.message ?? 'Datos inválidos' };
    }

    try {
        await UpdateCustomerUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to update customer:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo actualizar el cliente.' };
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
        await DeleteCustomerUseCase.execute(customerId, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to delete customer:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el cliente.' };
    }

    redirect('/dashboard/customers');
}
