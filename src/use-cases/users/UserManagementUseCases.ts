import bcryptjs from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import {
  validateTenantAccess,
  canModifyUser,
  requireAdminOrManager,
  requirePermission,
  getAssignableRoles,
  isAdmin,
} from '@/lib/auth-utils';
import { validatePassword, generateTemporaryPassword } from '@/lib/password-utils';
import { buildUserWhereClause } from '@/lib/user-filters';

type TenantDb = ReturnType<typeof getTenantPrisma>;

export interface CreateManagedUserInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  role: UserRole;
  password?: string | null;
}

export class CreateManagedUserUseCase {
  static async execute(
    input: CreateManagedUserInput,
    creatorId: string,
    creatorRole: UserRole,
    tenantId: string,
    db: TenantDb
  ) {
    requireAdminOrManager(creatorRole);

    const assignableRoles = getAssignableRoles(creatorRole);
    if (!isAdmin(creatorRole) && !assignableRoles.includes(input.role)) {
      throw new Error(`No puedes asignar el rol ${input.role}. Roles disponibles: ${assignableRoles.join(', ')}`);
    }

    const existingUser = await db.user.findFirst({
      where: { email: input.email, tenantId },
    });

    if (existingUser) {
      const error: any = new Error('Ya existe un usuario con ese email en este tenant');
      error.fieldErrors = { email: ['Email ya registrado'] };
      throw error;
    }

    let finalPassword = input.password || undefined;
    let passwordMustChange = true;

    if (finalPassword) {
      const passwordValidation = validatePassword(finalPassword);
      if (!passwordValidation.valid) {
        const error: any = new Error('Contraseña no cumple los requisitos');
        error.fieldErrors = { password: passwordValidation.errors };
        throw error;
      }
      passwordMustChange = false;
    } else {
      finalPassword = generateTemporaryPassword();
    }

    const hashedPassword = await bcryptjs.hash(finalPassword, 12);
    const firstName = input.firstName || '';
    const lastName = input.lastName || '';
    const name = input.name || `${firstName} ${lastName}`.trim() || input.email;

    const newUser = await db.user.create({
      data: {
        email: input.email,
        firstName,
        lastName,
        name,
        password: hashedPassword,
        role: input.role,
        tenantId,
        isActive: true,
        passwordMustChange,
        createdById: creatorId,
        updatedById: creatorId,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'USER_CREATED',
        module: 'USERS',
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

    return {
      newUser,
      finalPassword,
      passwordMustChange,
    };
  }
}

export interface UpdateManagedUserInput {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: UserRole;
}

export class UpdateManagedUserUseCase {
  static async execute(
    input: UpdateManagedUserInput,
    actorId: string,
    actorRole: UserRole,
    tenantId: string,
    db: TenantDb
  ) {
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser) {
      throw new Error('Usuario no encontrado');
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    const isSelf = actorId === input.userId;

    if (!isSelf) {
      requirePermission(actorRole, 'canEditUsers');

      if (!canModifyUser(actorRole, targetUser.role as UserRole, isSelf)) {
        throw new Error('No puedes modificar usuarios de igual o mayor jerarquía');
      }
    }

    if (input.role && input.role !== targetUser.role) {
      if (!isAdmin(actorRole)) {
        throw new Error('Solo los administradores pueden cambiar roles');
      }

      if (targetUser.role === 'ADMIN' && input.role !== 'ADMIN') {
        const adminCount = await db.user.count({
          where: { tenantId, role: 'ADMIN', isActive: true },
        });
        if (adminCount <= 1) {
          throw new Error('No puedes degradar al único administrador del tenant');
        }
      }
    }

    if (input.email && input.email !== targetUser.email) {
      const existingUser = await db.user.findFirst({
        where: { email: input.email, tenantId, NOT: { id: input.userId } },
      });
      if (existingUser) {
        const error: any = new Error('Ya existe un usuario con ese email');
        error.fieldErrors = { email: ['Email ya registrado'] };
        throw error;
      }
    }

    const updateData: Record<string, unknown> = {
      updatedById: actorId,
    };

    if (input.email) updateData['email'] = input.email;
    if (input.firstName) updateData['firstName'] = input.firstName;
    if (input.lastName) updateData['lastName'] = input.lastName;
    if (input.firstName || input.lastName || input.name) {
      updateData['name'] = input.name || `${input.firstName || targetUser.firstName || ''} ${input.lastName || targetUser.lastName || ''}`.trim();
    }
    if (input.role) updateData['role'] = input.role;

    const updatedUser = await db.user.update({
      where: { id: input.userId },
      data: updateData,
    });

    await db.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        module: 'USERS',
        details: JSON.stringify({
          userId: input.userId,
          changes: updateData,
          updatedBy: actorId,
        }),
        userId: actorId,
        tenantId,
      },
    });

    return { updatedUser };
  }
}

export class DeactivateUserUseCase {
  static async execute(
    userId: string,
    actorId: string,
    actorRole: UserRole,
    tenantId: string,
    db: TenantDb
  ) {
    if (userId === actorId) {
      throw new Error('No puedes desactivar tu propia cuenta');
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new Error('Usuario no encontrado');
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (!canModifyUser(actorRole, targetUser.role as UserRole, false)) {
      throw new Error('No puedes desactivar usuarios de igual o mayor jerarquía');
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await db.user.count({
        where: { tenantId, role: 'ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        throw new Error('No puedes desactivar al único administrador del tenant');
      }
    }

    await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedById: actorId,
      },
    });

    await db.auditLog.create({
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

    return { success: true, message: 'Usuario desactivado exitosamente' };
  }
}

export class ReactivateUserUseCase {
  static async execute(
    userId: string,
    actorId: string,
    tenantId: string,
    db: TenantDb
  ) {
    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new Error('Usuario no encontrado');
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (targetUser.isActive) {
      throw new Error('El usuario ya está activo');
    }

    await db.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedById: actorId,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await db.auditLog.create({
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

    return { success: true, message: 'Usuario reactivado exitosamente' };
  }
}

export class ResetPasswordUseCase {
  static async execute(
    userId: string,
    newPassword: string | undefined,
    actorId: string,
    actorRole: UserRole,
    tenantId: string,
    db: TenantDb
  ) {
    const isSelf = userId === actorId;

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new Error('Usuario no encontrado');
    }

    validateTenantAccess(tenantId, targetUser.tenantId);

    if (!isSelf && !canModifyUser(actorRole, targetUser.role as UserRole, false)) {
      throw new Error('No puedes resetear la contraseña de usuarios de igual o mayor jerarquía');
    }

    let finalPassword = newPassword;
    let passwordMustChange = true;

    if (newPassword) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        const error: any = new Error('Contraseña no cumple los requisitos');
        error.fieldErrors = { newPassword: passwordValidation.errors };
        throw error;
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

    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedById: actorId,
      },
    });

    await db.auditLog.create({
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
      temporaryPassword: passwordMustChange && !isSelf ? finalPassword : undefined,
    };
  }
}

export class ChangePasswordUseCase {
  static async execute(
    currentPassword: string,
    newPassword: string,
    userId: string,
    tenantId: string,
    db: TenantDb
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new Error('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcryptjs.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      const error: any = new Error('Contraseña actual incorrecta');
      error.fieldErrors = { currentPassword: ['Contraseña incorrecta'] };
      throw error;
    }

    const isSamePassword = await bcryptjs.compare(newPassword, user.password);
    if (isSamePassword) {
      const error: any = new Error('La nueva contraseña debe ser diferente a la actual');
      error.fieldErrors = { newPassword: ['Debe ser diferente a la actual'] };
      throw error;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      const error: any = new Error('Contraseña no cumple los requisitos');
      error.fieldErrors = { newPassword: passwordValidation.errors };
      throw error;
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordMustChange: false,
        updatedById: userId,
      },
    });

    await db.auditLog.create({
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
  }
}

export class GetUsersUseCase {
  static async execute(
    options: {
      includeInactive?: boolean;
      role?: UserRole;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } | undefined,
    tenantId: string,
    db: TenantDb
  ) {
    const where = buildUserWhereClause({
      tenantId,
      isActive: options?.includeInactive ? undefined : true,
      role: options?.role,
      search: options?.search,
    });

    const sortField = options?.sortBy || 'createdAt';
    const sortDirection = options?.sortOrder || 'desc';

    return await db.user.findMany({
      where,
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
      orderBy: {
        [sortField]: sortDirection,
      },
    });
  }
}
