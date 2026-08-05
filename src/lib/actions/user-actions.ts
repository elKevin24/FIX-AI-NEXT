'use server';

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { CreateUserSchema, UpdateUserSchema } from '@/lib/schemas';
import { ActionState } from '@/lib/types';

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

    const { name, email, password, role } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
        
        const existingUser = await tenantDb.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return { success: false, message: 'El usuario ya existe' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await tenantDb.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                tenantId: session.user.tenantId,
            }
        });

        return { success: true, message: 'Usuario creado exitosamente' };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { success: false, message: 'Error al crear usuario' };
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
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { userId, name, email, password, role } = validatedFields.data;

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingUser = await tenantDb.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        if (email !== existingUser.email) {
             const emailTaken = await tenantDb.user.findFirst({
                 where: { email }
             });
             if (emailTaken) {
                 return { success: false, message: 'Ya existe un usuario con este email' };
             }
        }

        const updateData: any = {
            name,
            email,
            role,
        };

        if (password && password.length > 0) {
            if (password.length < 6) {
                return { success: false, message: 'La contraseña debe tener al menos 6 caracteres' };
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        await tenantDb.user.update({
            where: { id: userId },
            data: updateData,
        });

    } catch (error) {
        console.error('Failed to update user:', error);
        return { success: false, message: 'Error de base de datos: No se pudo actualizar el usuario.' };
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

    if (userId === session.user.id) {
        return { success: false, message: 'No puedes eliminar tu propia cuenta' };
    }

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

        const existingUser = await tenantDb.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        await tenantDb.user.delete({
            where: { id: userId },
        });

    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: 'Error de base de datos: No se pudo eliminar el usuario.' };
    }

    redirect('/dashboard/users');
}
