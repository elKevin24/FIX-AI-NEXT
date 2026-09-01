'use server';

/**
 * User Management Server Actions
 *
 * Consolidated Server Actions for Multi-Tenant User Management:
 * - createUser: Crear nuevo usuario
 * - updateUser: Actualizar usuario existente
 * - deleteUser / deactivateUser: Desactivar usuario (Soft delete)
 * - reactivateUser: Reactivar usuario
 * - resetPassword: Resetear contraseña (Admin)
 * - changePassword: Cambiar contraseña propia
 * - getUsers: Obtener usuarios con filtros
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import bcryptjs from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
import { validatePassword, generateTemporaryPassword, passwordSchema } from '@/lib/password-utils';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre requerido').max(100).optional(),
  lastName: z.string().min(1, 'Apellido requerido').max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']),
  password: z.string().optional(),
});

const UpdateUserSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  email: z.string().email('Email inválido').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER']).optional(),
  password: z.string().optional(),
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
  _prevState: any,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: creatorId, tenantId, role: creatorRole } = session.user;

    if (creatorRole !== 'ADMIN' && (creatorRole as string) !== 'SUPER_ADMIN') {
      return { success: false, message: 'Solo los administradores pueden crear usuarios' };
    }

    const rawData = {
      email: formData.get('email'),
      firstName: formData.get('firstName') || undefined,
      lastName: formData.get('lastName') || undefined,
      name: formData.get('name') || undefined,
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

    const { email, firstName, lastName, name: providedName, role, password } = validatedFields.data;
    const resolvedName = providedName || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0];

    const existingUser = await getTenantPrisma(tenantId, session.user.id).user.findFirst({
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
    let passwordMustChange = false;

    if (password) {
      if (password.length < 6) {
        return {
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres',
          errors: { password: ['Mínimo 6 caracteres'] },
        };
      }
    } else {
      finalPassword = generateTemporaryPassword();
      passwordMustChange = true;
    }

    const hashedPassword = await bcryptjs.hash(finalPassword!, 12);

    const newUser = await getTenantPrisma(tenantId, session.user.id).user.create({
      data: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        name: resolvedName,
        password: hashedPassword,
        role: role as UserRole,
        tenantId,
        isActive: true,
        passwordMustChange,
        createdById: creatorId,
        updatedById: creatorId,
      },
    });

    try {
      await getTenantPrisma(tenantId, session.user.id).auditLog?.create?.({
        data: {
          action: 'USER_CREATED',
          module: 'USERS',
          details: JSON.stringify({
            newUserId: newUser?.id,
            email: newUser?.email || email,
            role: newUser?.role || role,
            createdBy: creatorId,
          }),
          userId: creatorId,
          tenantId,
        },
      });
    } catch (auditError) {
      console.warn('Could not record user creation in audit log:', auditError);
    }

    try {
      revalidatePath('/dashboard/users');
    } catch {}

    if (passwordMustChange) {
      return {
        success: true,
        message: `Usuario creado. Contraseña temporal: ${finalPassword}`,
        data: {
          userId: newUser?.id,
          email: newUser?.email || email,
          temporaryPassword: finalPassword,
        },
      };
    }

    return {
      success: true,
      message: 'Usuario creado exitosamente',
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
  _prevState: any,
  formData: FormData
): Promise<ActionState | void> {
  let shouldRedirect = false;
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
      name: formData.get('name') || undefined,
      role: formData.get('role') || undefined,
      password: formData.get('password') || undefined,
    };

    const validatedFields = UpdateUserSchema.safeParse(rawData);
    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Datos inválidos',
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { userId, email, firstName, lastName, name: providedName, role, password } = validatedFields.data;

    const targetUser = await getTenantPrisma(tenantId, session.user.id).user.findUnique({
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
        const adminCount = await getTenantPrisma(tenantId, session.user.id).user.count({
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
      const existingUser = await getTenantPrisma(tenantId, session.user.id).user.findFirst({
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

    const updateData: Record<string, unknown> = {
      updatedById: actorId,
    };

    if (email) updateData['email'] = email;
    if (firstName !== undefined) updateData['firstName'] = firstName;
    if (lastName !== undefined) updateData['lastName'] = lastName;
    if (providedName) {
      updateData['name'] = providedName;
    } else if (firstName || lastName) {
      updateData['name'] = `${firstName || targetUser.firstName || ''} ${lastName || targetUser.lastName || ''}`.trim();
    }
    if (role) updateData['role'] = role;

    if (password && password.length > 0) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: 'Contraseña no cumple los requisitos',
          errors: { password: passwordValidation.errors },
        };
      }
      updateData['password'] = await bcryptjs.hash(password, 12);
    }

    const updatedUser = await getTenantPrisma(tenantId, session.user.id).user.update({
      where: { id: userId },
      data: updateData,
    });

    await getTenantPrisma(tenantId, session.user.id).auditLog.create({
      data: {
        action: 'USER_UPDATED',
        module: 'USERS',
        details: JSON.stringify({
          userId,
          changes: updateData,
          updatedBy: actorId,
        }),
        userId: actorId,
        tenantId,
      },
    });

    revalidatePath('/dashboard/users');
    revalidatePath(`/dashboard/users/${userId}`);

    if (formData.get('_redirect') === 'true') {
      shouldRedirect = true;
    } else {
      return {
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: { userId: updatedUser.id },
      };
    }
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: 'Error al actualizar usuario' };
  }

  if (shouldRedirect) {
    redirect('/dashboard/users');
  }
}

// ============================================================================
// DEACTIVATE USER (Soft Delete)
// ============================================================================

export async function deactivateUser(
  _prevState: any,
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

    const targetUser = await getTenantPrisma(tenantId, session.user.id).user.findUnique({
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
      const adminCount = await getTenantPrisma(tenantId, session.user.id).user.count({
        where: { tenantId, role: 'ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          message: 'No puedes desactivar al único administrador del tenant',
        };
      }
    }

    await getTenantPrisma(tenantId, session.user.id).user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedById: actorId,
      },
    });

    await getTenantPrisma(tenantId, session.user.id).auditLog.create({
      data: {
        action: 'USER_DEACTIVATED',
        module: 'USERS',
        details: JSON.stringify({
          userId,
          email: targetUser.email,
          deactivatedBy: actorId,
        }),
        userId: actorId,
        tenantId,
      },
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
// DELETE USER (Alias for UI components expecting delete action)
// ============================================================================

export async function deleteUser(
  prevState: any,
  formData: FormData
): Promise<ActionState | void> {
  return deactivateUser(prevState, formData);
}

// ============================================================================
// REACTIVATE USER
// ============================================================================

export async function reactivateUser(
  _prevState: any,
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

    const targetUser = await getTenantPrisma(tenantId, session.user.id).user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (targetUser.isActive) {
      return { success: false, message: 'El usuario ya está activo' };
    }

    await getTenantPrisma(tenantId, session.user.id).user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedById: actorId,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await getTenantPrisma(tenantId, session.user.id).auditLog.create({
      data: {
        action: 'USER_REACTIVATED',
        module: 'USERS',
        details: JSON.stringify({
          userId,
          email: targetUser.email,
          reactivatedBy: actorId,
        }),
        userId: actorId,
        tenantId,
      },
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

export async function resetUserPassword(
  _prevState: any,
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

    const targetUser = await getTenantPrisma(tenantId, session.user.id).user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (!isSelf && !canModifyUser(actorRole as UserRole, targetUser.role as UserRole, false)) {
      return {
        success: false,
        message: 'No puedes resetear la contraseña de usuarios de igual o mayor jerarquía',
      };
    }

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
      passwordMustChange = !isSelf;
    } else {
      finalPassword = generateTemporaryPassword();
    }

    const hashedPassword = await bcryptjs.hash(finalPassword!, 12);

    await getTenantPrisma(tenantId, session.user.id).user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedById: actorId,
      },
    });

    await getTenantPrisma(tenantId, session.user.id).auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        module: 'USERS',
        details: JSON.stringify({
          userId,
          resetBy: actorId,
          isSelf,
          passwordMustChange,
        }),
        userId: actorId,
        tenantId,
      },
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
  _prevState: any,
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

    const user = await getTenantPrisma(tenantId, session.user.id).user.findUnique({
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

    await getTenantPrisma(tenantId, session.user.id).user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange: false,
        updatedById: userId,
      },
    });

    await getTenantPrisma(tenantId, session.user.id).auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        module: 'USERS',
        details: JSON.stringify({
          userId,
          changedBySelf: true,
        }),
        userId,
        tenantId,
      },
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

    const whereClause: Record<string, unknown> = {
      tenantId,
    };

    if (!options?.includeInactive) {
      whereClause['isActive'] = true;
    }

    if (options?.role) {
      whereClause['role'] = options.role;
    }

    if (options?.search) {
      whereClause['OR'] = [
        { email: { contains: options.search, mode: 'insensitive' } },
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const users = await getTenantPrisma(tenantId, session.user.id).user.findMany({
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

    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, message: 'Error al obtener usuarios' };
  }
}
