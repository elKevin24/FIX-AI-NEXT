/**
 * Authentication & Authorization Utilities
 *
 * Sistema de RBAC (Role-Based Access Control) para gestión multi-tenant.
 * Define permisos para cada rol y funciones de validación.
 *
 * Roles:
 * - ADMIN: Control total del tenant
 * - MANAGER: Gestiona tickets y usuarios (no puede cambiar config del tenant)
 * - TECHNICIAN: Crea y responde tickets asignados
 * - VIEWER: Solo lectura (Visualizador)
 */

import { UserRole } from '@prisma/client';

export { UserRole };

/**
 * Permisos definidos para cada rol
 */
export const ROLE_PERMISSIONS = {
  ADMIN: {
    // User Management
    canCreateUsers: true,
    canDeleteUsers: true,
    canEditUsers: true,
    canChangeRoles: true,
    canDeactivateUsers: true,

    // Tenant Management
    canManageTenantSettings: true,

    // Ticket Viewing
    canViewAllTickets: true,

    // Ticket Actions
    canTakeTicket: true,
    canAssignTickets: true,
    canStartTicket: true,
    canResolveTicket: true,
    canDeliverTicket: true,
    canCancelTickets: true,
    canReopenTickets: true,
    canWaitForParts: true,
    canResumeFromWaiting: true,
    canDeleteTickets: true,

    // Inventory
    canEditParts: true,
    canDeleteParts: true,
    canAddPartsToTicket: true,

    // Customer Management
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,

    // Advanced Features
    canViewReports: true,
    canManageTemplates: true,
    canExportData: true,
  },
  MANAGER: {
    // User Management
    canCreateUsers: true,
    canDeleteUsers: false,
    canEditUsers: true,
    canChangeRoles: false,
    canDeactivateUsers: true,

    // Tenant Management
    canManageTenantSettings: false,

    // Ticket Viewing
    canViewAllTickets: true,

    // Ticket Actions
    canTakeTicket: true,
    canAssignTickets: true,
    canStartTicket: true,
    canResolveTicket: true,
    canDeliverTicket: true,
    canCancelTickets: true,
    canReopenTickets: true,
    canWaitForParts: true,
    canResumeFromWaiting: true,
    canDeleteTickets: false,

    // Inventory
    canEditParts: true,
    canDeleteParts: false,
    canAddPartsToTicket: true,

    // Customer Management
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,

    // Advanced Features
    canViewReports: true,
    canManageTemplates: true,
    canExportData: true,
  },
  TECHNICIAN: {
    // User Management
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canChangeRoles: false,
    canDeactivateUsers: false,

    // Tenant Management
    canManageTenantSettings: false,

    // Ticket Viewing
    canViewAllTickets: false,

    // Ticket Actions
    canTakeTicket: true,
    canAssignTickets: false,
    canStartTicket: true,
    canResolveTicket: true,
    canDeliverTicket: false,
    canCancelTickets: false,
    canReopenTickets: false,
    canWaitForParts: true,
    canResumeFromWaiting: true,
    canDeleteTickets: false,

    // Inventory
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: true,

    // Customer Management
    canCreateCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,

    // Advanced Features
    canViewReports: false,
    canManageTemplates: false,
    canExportData: false,
  },
  VIEWER: {
    // User Management
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canChangeRoles: false,
    canDeactivateUsers: false,

    // Tenant Management
    canManageTenantSettings: false,

    // Ticket Viewing
    canViewAllTickets: true,

    // Ticket Actions
    canTakeTicket: false,
    canAssignTickets: false,
    canStartTicket: false,
    canResolveTicket: false,
    canDeliverTicket: false,
    canCancelTickets: false,
    canReopenTickets: false,
    canWaitForParts: false,
    canResumeFromWaiting: false,
    canDeleteTickets: false,

    // Inventory
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: false,

    // Customer Management
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,

    // Advanced Features
    canViewReports: true,
    canManageTemplates: false,
    canExportData: false,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.ADMIN;

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Verifica si el usuario es manager
 */
export function isManager(role: UserRole): boolean {
  return role === 'MANAGER';
}

/**
 * Verifica si el usuario es técnico
 */
export function isTechnician(role: UserRole): boolean {
  return role === 'TECHNICIAN';
}

/**
 * Verifica si el usuario es visualizador
 */
export function isViewer(role: UserRole): boolean {
  return role === 'VIEWER';
}

/**
 * Verifica si el usuario puede gestionar otros usuarios
 */
export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'canCreateUsers') || hasPermission(role, 'canEditUsers');
}

/**
 * Obtiene el nivel de jerarquía del rol (para comparaciones)
 * Mayor número = más permisos
 */
export function getRoleHierarchyLevel(role: UserRole): number {
  switch (role) {
    case 'ADMIN':
      return 4;
    case 'MANAGER':
      return 3;
    case 'TECHNICIAN':
      return 2;
    case 'VIEWER':
      return 1;
    default:
      return 0;
  }
}

/**
 * Verifica si un rol puede modificar a otro
 * (no puede modificar usuarios de igual o mayor jerarquía, excepto a sí mismo)
 */
export function canModifyUser(
  actorRole: UserRole,
  targetRole: UserRole,
  isSelf: boolean
): boolean {
  if (isSelf) return true;
  const actorLevel = getRoleHierarchyLevel(actorRole);
  const targetLevel = getRoleHierarchyLevel(targetRole);
  return actorLevel > targetLevel;
}

/**
 * Tipos de error de autorización
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string = 'FORBIDDEN'
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Valida que el usuario tenga el permiso requerido
 */
export function requirePermission(
  role: UserRole,
  permission: Permission,
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
 * Valida que el usuario sea admin o manager
 */
export function requireAdminOrManager(role: UserRole): void {
  if (!isAdmin(role) && !isManager(role)) {
    throw new AuthorizationError(
      'Solo administradores y managers pueden realizar esta acción',
      'ADMIN_OR_MANAGER_REQUIRED'
    );
  }
}

/**
 * Valida tenant isolation
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

// ============================================================================
// TICKET ACTION VALIDATORS
// ============================================================================

export const TICKET_ACTION_PERMISSIONS = {
  take: 'canTakeTicket',
  assign: 'canAssignTickets',
  start: 'canStartTicket',
  wait_for_parts: 'canWaitForParts',
  resume: 'canResumeFromWaiting',
  resolve: 'canResolveTicket',
  deliver: 'canDeliverTicket',
  cancel: 'canCancelTickets',
  reopen: 'canReopenTickets',
} as const;

export type TicketAction = keyof typeof TICKET_ACTION_PERMISSIONS;

export function requireTicketActionPermission(
  role: UserRole,
  action: TicketAction
): void {
  const permission = TICKET_ACTION_PERMISSIONS[action] as Permission;

  if (!hasPermission(role, permission)) {
    const actionLabels: Record<TicketAction, string> = {
      take: 'tomar el ticket',
      assign: 'asignar el ticket',
      start: 'iniciar el trabajo',
      wait_for_parts: 'marcar como esperando partes',
      resume: 'reanudar el trabajo',
      resolve: 'resolver el ticket',
      deliver: 'entregar/cerrar el ticket',
      cancel: 'cancelar el ticket',
      reopen: 'reabrir el ticket',
    };

    throw new AuthorizationError(
      `Tu rol (${role}) no tiene permiso para ${actionLabels[action]}`,
      'INSUFFICIENT_PERMISSIONS'
    );
  }
}

export function canPerformTicketAction(
  role: UserRole,
  action: TicketAction
): boolean {
  const permission = TICKET_ACTION_PERMISSIONS[action] as Permission;
  return hasPermission(role, permission);
}

// ============================================================================
// ROLE LABELS AND DISPLAY
// ============================================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  TECHNICIAN: 'Técnico',
  VIEWER: 'Visualizador',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Control total del tenant: gestión de usuarios, configuración y todas las operaciones',
  MANAGER: 'Gestiona tickets y usuarios, pero no puede cambiar la configuración del tenant',
  TECHNICIAN: 'Crea y responde tickets asignados, puede agregar partes a tickets',
  VIEWER: 'Solo puede ver información, sin capacidad de realizar cambios',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-red-100', text: 'text-red-800' },
  MANAGER: { bg: 'bg-purple-100', text: 'text-purple-800' },
  TECHNICIAN: { bg: 'bg-blue-100', text: 'text-blue-800' },
  VIEWER: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export function getSelectableRoles(): UserRole[] {
  return ['ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER'];
}

export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  const actorLevel = getRoleHierarchyLevel(actorRole);
  return getSelectableRoles().filter(
    (role) => getRoleHierarchyLevel(role) < actorLevel
  );
}