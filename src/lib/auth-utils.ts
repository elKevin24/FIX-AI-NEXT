/**
 * Authentication & Authorization Utilities
 *
 * Sistema de RBAC (Role-Based Access Control) para gestión multi-tenant.
 * Define permisos para cada rol y funciones de validación.
 *
 * Roles:
 * - ADMIN: Control total del tenant
 * - MANAGER: Gestiona tickets y usuarios (no puede cambiar config del tenant)
 * - AGENT: Crea y responde tickets asignados
 * - VIEWER: Solo lectura
 *
 * Roles Legacy (para compatibilidad):
 * - TECHNICIAN: Mapea a AGENT
 * - RECEPTIONIST: Mapea a VIEWER
 */

import { UserRole } from '@prisma/client';

export { UserRole };

/**
 * Normaliza roles legacy a los nuevos roles
 */
export function normalizeRole(role: UserRole): UserRole {
  switch (role) {
    case 'TECHNICIAN':
      return 'AGENT';
    case 'RECEPTIONIST':
      return 'VIEWER';
    default:
      return role;
  }
}

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
    canDeleteUsers: false, // Solo admin puede eliminar
    canEditUsers: true,
    canChangeRoles: false, // Solo admin puede cambiar roles
    canDeactivateUsers: true,

    // Tenant Management
    canManageTenantSettings: false, // Solo admin

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
    canDeleteTickets: false, // Solo admin

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
  AGENT: {
    // User Management
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canChangeRoles: false,
    canDeactivateUsers: false,

    // Tenant Management
    canManageTenantSettings: false,

    // Ticket Viewing
    canViewAllTickets: false, // Solo ve tickets asignados y pool

    // Ticket Actions
    canTakeTicket: true, // Puede auto-asignarse desde el pool
    canAssignTickets: false,
    canStartTicket: true,
    canResolveTicket: true,
    canDeliverTicket: false, // Solo admin/manager
    canCancelTickets: false,
    canReopenTickets: false,
    canWaitForParts: true,
    canResumeFromWaiting: true,
    canDeleteTickets: false,

    // Inventory
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: true, // Puede agregar partes mientras trabaja

    // Customer Management
    canCreateCustomers: true, // Puede crear clientes para nuevos tickets
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
    canViewReports: true, // Puede ver reportes
    canManageTemplates: false,
    canExportData: false,
  },
  // Legacy roles - map to new roles
  TECHNICIAN: {
    // Same as AGENT
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canChangeRoles: false,
    canDeactivateUsers: false,
    canManageTenantSettings: false,
    canViewAllTickets: false,
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
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: true,
    canCreateCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewReports: false,
    canManageTemplates: false,
    canExportData: false,
  },
  RECEPTIONIST: {
    // Same as VIEWER
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,
    canChangeRoles: false,
    canDeactivateUsers: false,
    canManageTenantSettings: false,
    canViewAllTickets: true,
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
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: false,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
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
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole]?.[permission] ?? false;
}

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

/**
 * Verifica si el usuario es manager
 */
export function isManager(role: UserRole): boolean {
  return role === UserRole.MANAGER;
}

/**
 * Verifica si el usuario es agent (o technician legacy)
 */
export function isAgent(role: UserRole): boolean {
  return role === UserRole.AGENT || role === UserRole.TECHNICIAN;
}

/**
 * Verifica si el usuario es viewer (o receptionist legacy)
 */
export function isViewer(role: UserRole): boolean {
  return role === UserRole.VIEWER || role === UserRole.RECEPTIONIST;
}

/**
 * Verifica si el usuario es técnico (legacy)
 */
export function isTechnician(role: UserRole): boolean {
  return role === UserRole.TECHNICIAN || role === UserRole.AGENT;
}

/**
 * Verifica si el usuario es recepcionista (legacy)
 */
export function isReceptionist(role: UserRole): boolean {
  return role === UserRole.RECEPTIONIST || role === UserRole.VIEWER;
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
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'ADMIN':
      return 4;
    case 'MANAGER':
      return 3;
    case 'AGENT':
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
  if (isSelf) return true; // Siempre puede modificarse a sí mismo
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
 * @throws AuthorizationError si no tiene permiso
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
 * Valida que el usuario sea admin o manager
 * @throws AuthorizationError si no tiene suficiente nivel
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
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Helper para verificar múltiples permisos (requiere todos)
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// ============================================================================
// TICKET ACTION VALIDATORS
// ============================================================================

/**
 * Mapeo de acciones de ticket a permisos requeridos
 */
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

/**
 * Valida si un usuario puede realizar una acción específica en un ticket
 * @throws AuthorizationError si no tiene permiso
 */
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

/**
 * Verifica si un usuario puede realizar una acción de ticket (sin throw)
 */
export function canPerformTicketAction(
  role: UserRole,
  action: TicketAction
): boolean {
  const permission = TICKET_ACTION_PERMISSIONS[action] as Permission;
  return hasPermission(role, permission);
}

/**
 * Obtiene todas las acciones que un rol puede realizar
 */
export function getAvailableTicketActions(role: UserRole): TicketAction[] {
  return (Object.keys(TICKET_ACTION_PERMISSIONS) as TicketAction[]).filter(
    (action) => canPerformTicketAction(role, action)
  );
}

// ============================================================================
// ROLE LABELS AND DISPLAY
// ============================================================================

/**
 * Etiquetas de roles para mostrar en UI
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  AGENT: 'Agente',
  VIEWER: 'Solo Lectura',
  TECHNICIAN: 'Técnico', // Legacy
  RECEPTIONIST: 'Recepcionista', // Legacy
};

/**
 * Descripciones de roles para tooltips/ayuda
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: 'Control total del tenant: gestión de usuarios, configuración y todas las operaciones',
  MANAGER: 'Gestiona tickets y usuarios, pero no puede cambiar la configuración del tenant',
  AGENT: 'Crea y responde tickets asignados, puede agregar partes a tickets',
  VIEWER: 'Solo puede ver información, sin capacidad de realizar cambios',
  TECHNICIAN: 'Rol legacy - equivalente a Agente',
  RECEPTIONIST: 'Rol legacy - equivalente a Solo Lectura',
};

/**
 * Colores de badges para roles
 */
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-red-100', text: 'text-red-800' },
  MANAGER: { bg: 'bg-purple-100', text: 'text-purple-800' },
  AGENT: { bg: 'bg-blue-100', text: 'text-blue-800' },
  VIEWER: { bg: 'bg-gray-100', text: 'text-gray-800' },
  TECHNICIAN: { bg: 'bg-blue-100', text: 'text-blue-800' },
  RECEPTIONIST: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

/**
 * Obtiene los roles disponibles para selección en UI
 * (excluye roles legacy)
 */
export function getSelectableRoles(): UserRole[] {
  return ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'] as UserRole[];
}

/**
 * Obtiene los roles que un usuario puede asignar a otros
 * (no puede asignar roles de igual o mayor nivel)
 */
export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  const actorLevel = getRoleHierarchyLevel(actorRole);
  return getSelectableRoles().filter(
    (role) => getRoleHierarchyLevel(role) < actorLevel
  );
}
