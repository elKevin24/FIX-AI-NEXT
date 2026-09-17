'use server';

/**
 * User Management Server Actions (Thin Controller)
 * Delegating all domain logic and side effects to dedicated Use Cases.
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  requirePermission,
  requireAdminOrManager,
  AuthorizationError,
  hasPermission,
} from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';
import { passwordSchema } from '@/lib/password-utils';
import {
  CreateUserSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
} from '@/lib/schemas';
import type { ActionResponse, ActionState } from '@/lib/types';
import {
  CreateManagedUserUseCase,
  UpdateManagedUserUseCase,
  DeactivateUserUseCase,
  ReactivateUserUseCase,
  ResetPasswordUseCase,
  ChangePasswordUseCase,
  GetUsersUseCase,
} from '@/use-cases/users';

export type { ActionResponse, ActionState };

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: passwordSchema,
});

// ============================================================================
// CREATE USER
// ============================================================================

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: creatorId, tenantId, role: creatorRole } = session.user;
    const db = getTenantPrisma(tenantId, creatorId);

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

    const result = await CreateManagedUserUseCase.execute(
      validatedFields.data,
      creatorId,
      creatorRole as UserRole,
      tenantId,
      db
    );

    revalidatePath('/dashboard/users');

    return {
      success: true,
      message: result.passwordMustChange
        ? `Usuario creado. Contraseña temporal: ${result.finalPassword}`
        : 'Usuario creado exitosamente',
      data: {
        userId: result.newUser.id,
        email: result.newUser.email,
        temporaryPassword: result.passwordMustChange ? result.finalPassword : undefined,
      },
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: error.message || 'Error al crear usuario',
      errors: error.fieldErrors,
    };
  }
}

// ============================================================================
// UPDATE USER
// ============================================================================

export async function updateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;
    const db = getTenantPrisma(tenantId, actorId);

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

    const { updatedUser } = await UpdateManagedUserUseCase.execute(
      validatedFields.data,
      actorId,
      actorRole as UserRole,
      tenantId,
      db
    );

    revalidatePath('/dashboard/users');
    revalidatePath(`/dashboard/users/${validatedFields.data.userId}`);

    return {
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { userId: updatedUser.id },
    };
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: error.message || 'Error al actualizar usuario',
      errors: error.fieldErrors,
    };
  }
}

// ============================================================================
// DEACTIVATE USER (Soft Delete)
// ============================================================================

export async function deactivateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
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

    const db = getTenantPrisma(tenantId, actorId);
    const result = await DeactivateUserUseCase.execute(
      userId,
      actorId,
      actorRole as UserRole,
      tenantId,
      db
    );

    revalidatePath('/dashboard/users');

    return result;
  } catch (error: any) {
    console.error('Error deactivating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: error.message || 'Error al desactivar usuario' };
  }
}

// ============================================================================
// REACTIVATE USER
// ============================================================================

export async function reactivateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
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

    const db = getTenantPrisma(tenantId, actorId);
    const result = await ReactivateUserUseCase.execute(
      userId,
      actorId,
      tenantId,
      db
    );

    revalidatePath('/dashboard/users');

    return result;
  } catch (error: any) {
    console.error('Error reactivating user:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: error.message || 'Error al reactivar usuario' };
  }
}

// ============================================================================
// RESET PASSWORD (Admin action)
// ============================================================================

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
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

    const db = getTenantPrisma(tenantId, actorId);
    const result = await ResetPasswordUseCase.execute(
      validatedFields.data.userId,
      validatedFields.data.newPassword,
      actorId,
      actorRole as UserRole,
      tenantId,
      db
    );

    return {
      success: true,
      message: result.message,
      data: {
        temporaryPassword: result.temporaryPassword,
      },
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    if (error instanceof AuthorizationError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: error.message || 'Error al resetear contraseña',
      errors: error.fieldErrors,
    };
  }
}

// ============================================================================
// CHANGE PASSWORD (Self action)
// ============================================================================

export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionResponse> {
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

    const db = getTenantPrisma(tenantId, userId);
    return await ChangePasswordUseCase.execute(
      validatedFields.data.currentPassword,
      validatedFields.data.newPassword,
      userId,
      tenantId,
      db
    );
  } catch (error: any) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: error.message || 'Error al cambiar contraseña',
      errors: error.fieldErrors,
    };
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

    if (
      !hasPermission(actorRole as UserRole, 'canEditUsers') &&
      !hasPermission(actorRole as UserRole, 'canCreateUsers')
    ) {
      return { success: false, message: 'Sin permiso para ver usuarios' };
    }

    const db = getTenantPrisma(tenantId, session.user.id);
    const users = await GetUsersUseCase.execute(options, tenantId, db);

    return { success: true, data: users };
  } catch (error: any) {
    console.error('Error getting users:', error);
    return { success: false, message: error.message || 'Error al obtener usuarios' };
  }
}
