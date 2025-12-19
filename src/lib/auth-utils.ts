/**
 * Authentication & Authorization Utilities
 *
 * Centraliza la validación de roles y permisos para evitar
 * código duplicado y garantizar consistencia.
 */

import { UserRole } from '@prisma/client';

export { UserRole };

/**
 * Permisos definidos para cada rol
 */
export const ROLE_PERMISSIONS = {
  ADMIN: {
    canCreateUsers: true,
    canDeleteUsers: true,
    canEditUsers: true,
    canViewAllTickets: true,
    canAssignTickets: true,
    canDeleteTickets: true,
    canEditParts: true,
    canDeleteParts: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canViewReports: true,
    canManageTemplates: true,
    canCancelTickets: true,
    canReopenClosedTickets: true,
  },
  TECHNICIAN: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canViewAllTickets: false, // Solo ve tickets asignados y pool
    canAssignTickets: false,
    canDeleteTickets: false,
    canEditParts: false,
    canDeleteParts: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewReports: false,
    canManageTemplates: false,
    canCancelTickets: false, // Solo admin puede cancelar
    canReopenClosedTickets: false,
  },
  RECEPTIONIST: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canViewAllTickets: true,
    canAssignTickets: false,
    canDeleteTickets: false,
    canEditParts: false,
    canDeleteParts: false,
    canEditCustomers: true, // Puede editar clientes
    canDeleteCustomers: false,
    canViewReports: false,
    canManageTemplates: false,
    canCancelTickets: false,
    canReopenClosedTickets: false,
  },
} as const;

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.ADMIN
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Verifica si el usuario es técnico
 */
export function isTechnician(role: UserRole): boolean {
  return role === UserRole.TECHNICIAN;
}

/**
 * Verifica si el usuario es recepcionista
 */
export function isReceptionist(role: UserRole): boolean {
  return role === UserRole.RECEPTIONIST;
}

/**
 * Tipos de error de autorización
 */
export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'FORBIDDEN') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Valida que el usuario tenga el permiso requerido
 * @throws AuthorizationError si no tiene permiso
 */
export function requirePermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.ADMIN,
  customMessage?: string
): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(
      customMessage ||
        `Tu rol (${role}) no tiene permiso para realizar esta acción (${permission})`,
      'FORBIDDEN'
    );
  }
}

/**
 * Valida que el usuario sea admin
 * @throws AuthorizationError si no es admin
 */
export function requireAdmin(role: UserRole): void {
  if (!isAdmin(role)) {
    throw new AuthorizationError(
      'Solo los administradores pueden realizar esta acción',
      'ADMIN_REQUIRED'
    );
  }
}

/**
 * Valida tenant isolation - verifica que el recurso pertenezca al tenant del usuario
 */
export function validateTenantAccess(
  userTenantId: string,
  resourceTenantId: string | null | undefined
): void {
  if (!resourceTenantId) {
    throw new AuthorizationError(
      'El recurso no tiene tenant asociado',
      'INVALID_RESOURCE'
    );
  }

  if (userTenantId !== resourceTenantId) {
    throw new AuthorizationError(
      'No tienes acceso a recursos de otro tenant',
      'TENANT_ISOLATION_VIOLATION'
    );
  }
}

/**
 * Helper para verificar múltiples permisos (requiere al menos uno)
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Array<keyof typeof ROLE_PERMISSIONS.ADMIN>
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Helper para verificar múltiples permisos (requiere todos)
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Array<keyof typeof ROLE_PERMISSIONS.ADMIN>
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
