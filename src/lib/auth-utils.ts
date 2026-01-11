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
    // User Management
    canCreateUsers: true,
    canDeleteUsers: true,
    canEditUsers: true,

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
    canEditCustomers: true,
    canDeleteCustomers: true,

    // Advanced Features
    canViewReports: true,
    canManageTemplates: true,
  },
  TECHNICIAN: {
    // User Management
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,

    // Ticket Viewing
    canViewAllTickets: false, // Solo ve tickets asignados y pool

    // Ticket Actions
    canTakeTicket: true, // Puede auto-asignarse desde el pool
    canAssignTickets: false, // No puede asignar a otros
    canStartTicket: true,
    canResolveTicket: true,
    canDeliverTicket: false, // Solo admin puede cerrar definitivamente
    canCancelTickets: false, // Solo admin puede cancelar
    canReopenTickets: false, // Solo admin puede reabrir
    canWaitForParts: true,
    canResumeFromWaiting: true,
    canDeleteTickets: false,

    // Inventory
    canEditParts: false,
    canDeleteParts: false,
    canAddPartsToTicket: true, // Puede agregar partes mientras trabaja

    // Customer Management
    canEditCustomers: false,
    canDeleteCustomers: false,

    // Advanced Features
    canViewReports: false,
    canManageTemplates: false,
  },
  RECEPTIONIST: {
    // User Management
    canCreateUsers: false,
    canDeleteUsers: false,
    canEditUsers: false,

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
    canEditCustomers: true, // Puede editar clientes
    canDeleteCustomers: false,

    // Advanced Features
    canViewReports: false,
    canManageTemplates: false,
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
  const permission = TICKET_ACTION_PERMISSIONS[action] as keyof typeof ROLE_PERMISSIONS.ADMIN;

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
  const permission = TICKET_ACTION_PERMISSIONS[action] as keyof typeof ROLE_PERMISSIONS.ADMIN;
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
