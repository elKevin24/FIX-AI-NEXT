'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/schemas';
import { CreateCustomerUseCase, UpdateCustomerUseCase, DeleteCustomerUseCase } from '@/use-cases/customers/CustomerUseCases';
import { toClientMessage } from '@/lib/errors';
import { ActionState } from '@/lib/types';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

/**
 * Create a new customer (Server Action)
 */
export async function createCustomer(prevState: ActionState, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (!hasPermission(session.user.role as UserRole, 'canCreateCustomers')) {
        return { success: false, message: 'No tienes permiso para crear clientes' };
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
        return { success: false, message: toClientMessage(error, 'No se pudo crear el cliente.') };
    }

    redirect('/dashboard/customers');
}

/**
 * Update an existing customer (Server Action)
 */
export async function updateCustomer(prevState: ActionState, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }
    if (!hasPermission(session.user.role as UserRole, 'canEditCustomers')) {
        return { success: false, message: 'No tienes permiso para editar clientes' };
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
        return { success: false, message: toClientMessage(error, 'No se pudo actualizar el cliente.') };
    }

    redirect('/dashboard/customers');
}

/**
 * Delete a customer (Server Action)
 */
export async function deleteCustomer(prevState: ActionState, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (!hasPermission(session.user.role as UserRole, 'canDeleteCustomers')) {
        return { success: false, message: 'No tienes permiso para eliminar clientes' };
    }

    const customerId = formData.get('customerId') as string;

    if (!customerId) {
        return { success: false, message: 'ID de cliente requerido' };
    }

    try {
        await DeleteCustomerUseCase.execute(customerId, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to delete customer:', error);
        return { success: false, message: toClientMessage(error, 'No se pudo eliminar el cliente.') };
    }

    redirect('/dashboard/customers');
}
