'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CreateUserSchema, UpdateUserSchema } from '@/lib/schemas';
import { ActionState } from '@/lib/types';
import { CreateUserUseCase, UpdateUserUseCase, DeleteUserUseCase } from '@/use-cases/users/UserUseCases';

/**
 * Create a new user (Server Action)
 */
export async function createUser(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden crear usuarios' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = CreateUserSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { 
            success: false, 
            message: 'Error de validación', 
            errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    try {
        await CreateUserUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id);
        return { success: true, message: 'Usuario creado exitosamente' };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error al crear usuario' };
    }
}

/**
 * Update an existing user (Server Action)
 */
export async function updateUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden editar usuarios' };
    }

    const formDataObj = Object.fromEntries(formData);
    const validatedFields = UpdateUserSchema.safeParse(formDataObj);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0]?.message ?? 'Datos inválidos' };
    }

    try {
        await UpdateUserUseCase.execute(validatedFields.data, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to update user:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo actualizar el usuario.' };
    }

    redirect('/dashboard/users');
}

/**
 * Delete a user (Server Action)
 */
export async function deleteUser(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Solo los administradores pueden eliminar usuarios' };
    }

    const userId = formData.get('userId') as string;

    if (!userId) {
        return { success: false, message: 'ID de usuario requerido' };
    }

    try {
        await DeleteUserUseCase.execute(userId, session.user.tenantId, session.user.id);
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Error de base de datos: No se pudo eliminar el usuario.' };
    }

    redirect('/dashboard/users');
}
