'use server';

/**
 * User Management Server Actions
 *
 * Acciones para gestión de usuarios en sistema multi-tenant:
 * - createUser: Crear nuevo usuario
 * - updateUser: Actualizar usuario existente
 * - deactivateUser: Soft delete (desactivar)
 * - reactivateUser: Reactivar usuario
 * - resetPassword: Resetear contraseña
 * - changePassword: Cambiar contraseña propia
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcryptjs from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  hasPermission,
  requirePermission,
  requireAdminOrManager,
  validateTenantAccess,
  canModifyUser,
  isAdmin,
  AuthorizationError,
  getAssignableRoles,
} from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';
import { logAction } from './audit-actions';

// Logic moved to src/lib/password-utils.ts
import {
  PASSWORD_POLICY,
  passwordSchema,
  validatePassword,
  generateTemporaryPassword,
} from '@/lib/password-utils';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre requerido').max(100),
  lastName: z.string().min(1, 'Apellido requerido').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER', 'TECHNICIAN', 'RECEPTIONIST']),
  password: z.string().optional(),
});

const UpdateUserSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  email: z.string().email('Email inválido').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER', 'TECHNICIAN', 'RECEPTIONIST']).optional(),
});

const ResetPasswordSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  newPassword: z.string().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: passwordSchema,
});

// ============================================================================
// TYPES
// ============================================================================

export type ActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

// ============================================================================
// CREATE USER
// ============================================================================

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: creatorId, tenantId, role: creatorRole } = session.user;

    requireAdminOrManager(creatorRole as UserRole);

    const rawData = {
      email: formData.get('email'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      role: formData.get('role'),
      password: formData.get('password') || undefined,
    };

    const validatedFields = CreateUserSchema.safeParse(rawData);
    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { email, firstName, lastName, role, password } = validatedFields.data;

    const assignableRoles = getAssignableRoles(creatorRole as UserRole);
    if (!isAdmin(creatorRole as UserRole) && !assignableRoles.includes(role as UserRole)) {
      return {
        success: false,
        message: `No puedes asignar el rol ${role}. Roles disponibles: ${assignableRoles.join(', ')}`,
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      return {
        success: false,
        message: 'Ya existe un usuario con ese email en este tenant',
        errors: { email: ['Email ya registrado'] },
      };
    }

    let finalPassword = password;
    let passwordMustChange = true;

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: 'Contraseña no cumple los requisitos',
          errors: { password: passwordValidation.errors },
        };
      }
      passwordMustChange = false;
    } else {
      finalPassword = generateTemporaryPassword();
    }

    const hashedPassword = await bcryptjs.hash(finalPassword!, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        password: hashedPassword,
        role: role as UserRole,
        tenantId,
        isActive: true,
        passwordMustChange,
        createdById: creatorId,
        updatedById: creatorId,
      },
    });

    await logAction('USER_CREATED', 'USERS', {
      entityType: 'User',
      entityId: newUser.id,
      metadata: {
        email: newUser.email,
        role: newUser.role,
        createdBy: creatorId,
      },
      tenantId,
      userId: creatorId,
    });

    revalidatePath('/dashboard/users');

    return {
      success: true,
      message: passwordMustChange
        ? `Usuario creado. Contraseña temporal: ${finalPassword}`
        : 'Usuario creado exitosamente',
      data: {
        userId: newUser.id,
        email: newUser.email,
        temporaryPassword: passwordMustChange ? finalPassword : undefined,
      },
    };
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al crear usuario' };
  }
}

// ============================================================================
// UPDATE USER
// ============================================================================

export async function updateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    const rawData = {
      userId: formData.get('userId'),
      email: formData.get('email') || undefined,
      firstName: formData.get('firstName') || undefined,
      lastName: formData.get('lastName') || undefined,
      role: formData.get('role') || undefined,
    };

    const validatedFields = UpdateUserSchema.safeParse(rawData);
    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { userId, email, firstName, lastName, role } = validatedFields.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    const isSelf = actorId === userId;

    if (!isSelf) {
      requirePermission(actorRole as UserRole, 'canEditUsers');

      if (!canModifyUser(actorRole as UserRole, targetUser.role as UserRole, isSelf)) {
        return {
          success: false,
          message: 'No puedes modificar usuarios de igual o mayor jerarquía',
        };
      }
    }

    if (role && role !== targetUser.role) {
      if (!isAdmin(actorRole as UserRole)) {
        return {
          success: false,
          message: 'Solo los administradores pueden cambiar roles',
        };
      }

      if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { tenantId, role: 'ADMIN', isActive: true },
        });
        if (adminCount <= 1) {
          return {
            success: false,
            message: 'No puedes degradar al único administrador del tenant',
          };
        }
      }
    }

    if (email && email !== targetUser.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, tenantId, NOT: { id: userId } },
      });
      if (existingUser) {
        return {
          success: false,
          message: 'Ya existe un usuario con ese email',
          errors: { email: ['Email ya registrado'] },
        };
      }
    }

    const updateData: any = {
      updatedById: actorId,
    };

    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName || lastName) {
      updateData.name = `${firstName || targetUser.firstName || ''} ${lastName || targetUser.lastName || ''}`.trim();
    }
    if (role) updateData.role = role as UserRole;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await logAction('USER_UPDATED', 'USERS', {
      entityType: 'User',
      entityId: userId,
      metadata: {
        changes: updateData,
        updatedBy: actorId,
      },
      tenantId,
      userId: actorId,
    });

    revalidatePath('/dashboard/users');
    revalidatePath(`/dashboard/users/${userId}`);

    return {
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { userId: updatedUser.id },
    };
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al actualizar usuario' };
  }
}

// ============================================================================
// DEACTIVATE USER (Soft Delete)
// ============================================================================

export async function deactivateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    requirePermission(actorRole as UserRole, 'canDeactivateUsers');

    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, message: 'ID de usuario requerido' };
    }

    if (userId === actorId) {
      return { success: false, message: 'No puedes desactivar tu propia cuenta' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (!canModifyUser(actorRole as UserRole, targetUser.role as UserRole, false)) {
      return {
        success: false,
        message: 'No puedes desactivar usuarios de igual o mayor jerarquía',
      };
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { tenantId, role: 'ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          message: 'No puedes desactivar al único administrador del tenant',
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedById: actorId,
      },
    });

    await logAction('USER_DEACTIVATED', 'USERS', {
      entityType: 'User',
      entityId: userId,
      metadata: {
        email: targetUser.email,
        deactivatedBy: actorId,
      },
      tenantId,
      userId: actorId,
    });

    revalidatePath('/dashboard/users');

    return {
      success: true,
      message: 'Usuario desactivado exitosamente',
    };
  } catch (error) {
    console.error('Error deactivating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al desactivar usuario' };
  }
}

// ============================================================================
// REACTIVATE USER
// ============================================================================

export async function reactivateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    requirePermission(actorRole as UserRole, 'canDeactivateUsers');

    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, message: 'ID de usuario requerido' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (targetUser.isActive) {
      return { success: false, message: 'El usuario ya está activo' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedById: actorId,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await logAction('USER_REACTIVATED', 'USERS', {
      entityType: 'User',
      entityId: userId,
      metadata: {
        email: targetUser.email,
        reactivatedBy: actorId,
      },
      tenantId,
      userId: actorId,
    });

    revalidatePath('/dashboard/users');

    return {
      success: true,
      message: 'Usuario reactivado exitosamente',
    };
  } catch (error) {
    console.error('Error reactivating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al reactivar usuario' };
  }
}

// ============================================================================
// RESET PASSWORD (Admin action)
// ============================================================================

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    const userId = formData.get('userId') as string;
    const isSelf = userId === actorId;

    if (!isSelf) {
      requireAdminOrManager(actorRole as UserRole);
    }

    const rawData = {
      userId,
      newPassword: formData.get('newPassword') || undefined,
    };

    const validatedFields = ResetPasswordSchema.safeParse(rawData);
    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { newPassword } = validatedFields.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    let finalPassword = newPassword;
    let passwordMustChange = true;

    if (newPassword) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: 'Contraseña no cumple los requisitos',
          errors: { newPassword: passwordValidation.errors },
        };
      }
      if (!isSelf) {
        passwordMustChange = true;
      } else {
        passwordMustChange = false;
      }
    } else {
      finalPassword = generateTemporaryPassword();
    }

    const hashedPassword = await bcryptjs.hash(finalPassword!, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedById: actorId,
      },
    });

    await logAction('PASSWORD_RESET', 'USERS', {
      entityType: 'User',
      entityId: userId,
      metadata: {
        resetBy: actorId,
        isSelf,
        passwordMustChange,
      },
      tenantId,
      userId: actorId,
    });

    return {
      success: true,
      message: passwordMustChange
        ? `Contraseña reseteada. Nueva contraseña temporal: ${finalPassword}`
        : 'Contraseña actualizada exitosamente',
      data: {
        temporaryPassword: passwordMustChange && !isSelf ? finalPassword : undefined,
      },
    };
  } catch (error) {
    console.error('Error resetting password:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al resetear contraseña' };
  }
}

// ============================================================================
// CHANGE PASSWORD (Self action)
// ============================================================================

export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: userId, tenantId } = session.user;

    const rawData = {
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
    };

    const validatedFields = ChangePasswordSchema.safeParse(rawData);
    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { currentPassword, newPassword } = validatedFields.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const isValidPassword = await bcryptjs.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Contraseña actual incorrecta',
        errors: { currentPassword: ['Contraseña incorrecta'] },
      };
    }

    const isSamePassword = await bcryptjs.compare(newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual',
        errors: { newPassword: ['Debe ser diferente a la actual'] },
      };
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange: false,
        updatedById: userId,
      },
    });

    await logAction('PASSWORD_CHANGED', 'USERS', {
      entityType: 'User',
      entityId: userId,
      metadata: {
        changedBySelf: true,
      },
      tenantId,
      userId,
    });

    return {
      success: true,
      message: 'Contraseña cambiada exitosamente',
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Error al cambiar contraseña' };
  }
}

// ============================================================================
// GET USERS (with filters)
// ============================================================================

export async function getUsers(options?: {
  includeInactive?: boolean;
  role?: UserRole;
  search?: string;
}): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }>;
  message?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { tenantId, role: actorRole } = session.user;

    if (!hasPermission(actorRole as UserRole, 'canEditUsers') &&
        !hasPermission(actorRole as UserRole, 'canCreateUsers')) {
      return { success: false, message: 'Sin permiso para ver usuarios' };
    }

    const whereClause: any = {
      tenantId,
    };

    if (!options?.includeInactive) {
      whereClause.isActive = true;
    }

    if (options?.role) {
      whereClause.role = options.role;
    }

    if (options?.search) {
      whereClause.OR = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: users as any };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, message: 'Error al obtener usuarios' };
  }
}