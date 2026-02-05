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
import crypto from 'crypto';

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Política de contraseñas:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.minLength, `Mínimo ${PASSWORD_POLICY.minLength} caracteres`)
  .refine(
    (val) => !PASSWORD_POLICY.requireUppercase || /[A-Z]/.test(val),
    'Debe contener al menos una mayúscula'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireLowercase || /[a-z]/.test(val),
    'Debe contener al menos una minúscula'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireNumber || /\d/.test(val),
    'Debe contener al menos un número'
  )
  .refine(
    (val) => !PASSWORD_POLICY.requireSpecial || /[!@#$%^&*(),.?":{}|<>]/.test(val),
    'Debe contener al menos un carácter especial (!@#$%^&*...)'
  );

/**
 * Valida una contraseña contra la política
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

/**
 * Genera una contraseña temporal segura
 */
export function generateTemporaryPassword(): string {
  const chars = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%&*',
  };

  const allChars = chars.upper + chars.lower + chars.numbers + chars.special;
  let password = '';

  // Helper para generar enteros aleatorios seguros
  const secureRandomInt = (max: number) => crypto.randomInt(0, max);

  // Garantizar al menos uno de cada tipo
  password += chars.upper[secureRandomInt(chars.upper.length)];
  password += chars.lower[secureRandomInt(chars.lower.length)];
  password += chars.numbers[secureRandomInt(chars.numbers.length)];
  password += chars.special[secureRandomInt(chars.special.length)];

  // Completar hasta 12 caracteres
  for (let i = 4; i < 12; i++) {
    password += allChars[secureRandomInt(allChars.length)];
  }

  // Mezclar usando Fisher-Yates seguro
  const passwordChars = password.split('');
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }
  
  return passwordChars.join('');
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(1, 'Nombre requerido').max(100),
  lastName: z.string().min(1, 'Apellido requerido').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER']),
  password: z.string().optional(), // Si no se provee, se genera uno temporal
});

const UpdateUserSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  email: z.string().email('Email inválido').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).optional(),
});

const ResetPasswordSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  newPassword: z.string().optional(), // Si no se provee, se genera uno temporal
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
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: creatorId, tenantId, role: creatorRole } = session.user;

    // 2. Verificar permisos
    requireAdminOrManager(creatorRole as UserRole);

    // 3. Validar datos
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

    // 4. Verificar que el creador puede asignar este rol
    const assignableRoles = getAssignableRoles(creatorRole as UserRole);
    if (!isAdmin(creatorRole as UserRole) && !assignableRoles.includes(role as UserRole)) {
      return {
        success: false,
        message: `No puedes asignar el rol ${role}. Roles disponibles: ${assignableRoles.join(', ')}`,
      };
    }

    // 5. Verificar email único dentro del tenant
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

    // 6. Generar o validar contraseña
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

    // 7. Hashear contraseña
    const hashedPassword = await bcryptjs.hash(finalPassword!, 12);

    // 8. Crear usuario
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

    // 9. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        details: JSON.stringify({
          newUserId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          createdBy: creatorId,
        }),
        userId: creatorId,
        tenantId,
      },
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
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    // 2. Validar datos
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

    // 3. Obtener usuario objetivo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // 4. Verificar acceso al tenant
    validateTenantAccess(tenantId, targetUser.tenantId);

    const isSelf = actorId === userId;

    // 5. Verificar permisos
    if (!isSelf) {
      requirePermission(actorRole as UserRole, 'canEditUsers');

      if (!canModifyUser(actorRole as UserRole, targetUser.role as UserRole, isSelf)) {
        return {
          success: false,
          message: 'No puedes modificar usuarios de igual o mayor jerarquía',
        };
      }
    }

    // 6. Solo ADMIN puede cambiar roles
    if (role && role !== targetUser.role) {
      if (!isAdmin(actorRole as UserRole)) {
        return {
          success: false,
          message: 'Solo los administradores pueden cambiar roles',
        };
      }

      // No permitir degradar al último admin
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

    // 7. Verificar email único si se está cambiando
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

    // 8. Preparar datos de actualización
    const updateData: Record<string, unknown> = {
      updatedById: actorId,
    };

    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName || lastName) {
      updateData.name = `${firstName || targetUser.firstName || ''} ${lastName || targetUser.lastName || ''}`.trim();
    }
    if (role) updateData.role = role;

    // 9. Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 10. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
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
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    // 2. Verificar permisos
    requirePermission(actorRole as UserRole, 'canDeactivateUsers');

    // 3. Obtener userId
    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, message: 'ID de usuario requerido' };
    }

    // 4. No permitir auto-desactivación
    if (userId === actorId) {
      return { success: false, message: 'No puedes desactivar tu propia cuenta' };
    }

    // 5. Obtener usuario objetivo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // 6. Verificar acceso al tenant
    validateTenantAccess(tenantId, targetUser.tenantId);

    // 7. Verificar jerarquía
    if (!canModifyUser(actorRole as UserRole, targetUser.role as UserRole, false)) {
      return {
        success: false,
        message: 'No puedes desactivar usuarios de igual o mayor jerarquía',
      };
    }

    // 8. No permitir desactivar al último ADMIN
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

    // 9. Desactivar usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedById: actorId,
      },
    });

    // 10. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_DEACTIVATED',
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
// REACTIVATE USER
// ============================================================================

export async function reactivateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    // 2. Verificar permisos (mismo permiso que desactivar)
    requirePermission(actorRole as UserRole, 'canDeactivateUsers');

    // 3. Obtener userId
    const userId = formData.get('userId') as string;
    if (!userId) {
      return { success: false, message: 'ID de usuario requerido' };
    }

    // 4. Obtener usuario objetivo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // 5. Verificar acceso al tenant
    validateTenantAccess(tenantId, targetUser.tenantId);

    // 6. Verificar que está desactivado
    if (targetUser.isActive) {
      return { success: false, message: 'El usuario ya está activo' };
    }

    // 7. Reactivar usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedById: actorId,
        // Resetear intentos de login fallidos
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 8. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_REACTIVATED',
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

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: actorId, tenantId, role: actorRole } = session.user;

    // 2. Solo ADMIN puede resetear contraseñas de otros
    const userId = formData.get('userId') as string;
    const isSelf = userId === actorId;

    if (!isSelf) {
      requireAdminOrManager(actorRole as UserRole);
    }

    // 3. Validar datos
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

    // 4. Obtener usuario objetivo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // 5. Verificar acceso al tenant
    validateTenantAccess(tenantId, targetUser.tenantId);

    // 6. Generar o validar contraseña
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
      // Si el admin provee una contraseña específica, no forzar cambio
      if (!isSelf) {
        passwordMustChange = true; // Siempre forzar cambio si es reset por admin
      } else {
        passwordMustChange = false;
      }
    } else {
      finalPassword = generateTemporaryPassword();
    }

    // 7. Hashear y actualizar
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

    // 8. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
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
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. Verificar sesión
    const session = await auth();
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, message: 'No autorizado' };
    }

    const { id: userId, tenantId } = session.user;

    // 2. Validar datos
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

    // 3. Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // 4. Verificar contraseña actual
    const isValidPassword = await bcryptjs.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Contraseña actual incorrecta',
        errors: { currentPassword: ['Contraseña incorrecta'] },
      };
    }

    // 5. No permitir misma contraseña
    const isSamePassword = await bcryptjs.compare(newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual',
        errors: { newPassword: ['Debe ser diferente a la actual'] },
      };
    }

    // 6. Hashear y actualizar
    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange: false,
        updatedById: userId,
      },
    });

    // 7. Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
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

    // Verificar permiso para ver usuarios
    if (!hasPermission(actorRole as UserRole, 'canEditUsers') &&
        !hasPermission(actorRole as UserRole, 'canCreateUsers')) {
      return { success: false, message: 'Sin permiso para ver usuarios' };
    }

    const whereClause: Record<string, unknown> = {
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

    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, message: 'Error al obtener usuarios' };
  }
}
