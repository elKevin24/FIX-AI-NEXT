import { describe, it, expect } from 'vitest';
import {
  hasPermission, isAdmin, isManager, isTechnician, isViewer,
  canManageUsers, getRoleHierarchyLevel, canModifyUser,
  AuthorizationError, requirePermission, requireAdmin,
  requireAdminOrManager, validateTenantAccess,
  requireTicketActionPermission, canPerformTicketAction,
  getSelectableRoles, getAssignableRoles,
  ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS,
} from './auth-utils';

describe('auth-utils', () => {
  describe('hasPermission', () => {
    it('ADMIN has all permissions', () => {
      expect(hasPermission('ADMIN', 'canCreateUsers')).toBe(true);
      expect(hasPermission('ADMIN', 'canDeleteUsers')).toBe(true);
      expect(hasPermission('ADMIN', 'canManageTenantSettings')).toBe(true);
      expect(hasPermission('ADMIN', 'canViewReports')).toBe(true);
      expect(hasPermission('ADMIN', 'canExportData')).toBe(true);
    });

    it('VIEWER has only read permissions', () => {
      expect(hasPermission('VIEWER', 'canViewAllTickets')).toBe(true);
      expect(hasPermission('VIEWER', 'canViewReports')).toBe(true);
      expect(hasPermission('VIEWER', 'canCreateUsers')).toBe(false);
      expect(hasPermission('VIEWER', 'canTakeTicket')).toBe(false);
      expect(hasPermission('VIEWER', 'canEditParts')).toBe(false);
    });

    it('TECHNICIAN has ticket action but not management permissions', () => {
      expect(hasPermission('TECHNICIAN', 'canTakeTicket')).toBe(true);
      expect(hasPermission('TECHNICIAN', 'canResolveTicket')).toBe(true);
      expect(hasPermission('TECHNICIAN', 'canCreateUsers')).toBe(false);
      expect(hasPermission('TECHNICIAN', 'canViewReports')).toBe(false);
      expect(hasPermission('TECHNICIAN', 'canDeleteParts')).toBe(false);
    });

    it('MANAGER has most permissions except delete/change roles', () => {
      expect(hasPermission('MANAGER', 'canCreateUsers')).toBe(true);
      expect(hasPermission('MANAGER', 'canDeleteUsers')).toBe(false);
      expect(hasPermission('MANAGER', 'canChangeRoles')).toBe(false);
      expect(hasPermission('MANAGER', 'canViewReports')).toBe(true);
      expect(hasPermission('MANAGER', 'canManageTenantSettings')).toBe(false);
    });

    it('returns false for unknown permission', () => {
      expect(hasPermission('ADMIN', 'nonexistent' as any)).toBe(false);
    });
  });

  describe('role check functions', () => {
    it('isAdmin returns true only for ADMIN', () => {
      expect(isAdmin('ADMIN')).toBe(true);
      expect(isAdmin('MANAGER')).toBe(false);
      expect(isAdmin('TECHNICIAN')).toBe(false);
      expect(isAdmin('VIEWER')).toBe(false);
    });

    it('isManager returns true only for MANAGER', () => {
      expect(isManager('MANAGER')).toBe(true);
      expect(isManager('ADMIN')).toBe(false);
    });

    it('isTechnician returns true only for TECHNICIAN', () => {
      expect(isTechnician('TECHNICIAN')).toBe(true);
      expect(isTechnician('ADMIN')).toBe(false);
    });

    it('isViewer returns true only for VIEWER', () => {
      expect(isViewer('VIEWER')).toBe(true);
      expect(isViewer('ADMIN')).toBe(false);
    });
  });

  describe('getRoleHierarchyLevel', () => {
    it('ADMIN is level 4', () => expect(getRoleHierarchyLevel('ADMIN')).toBe(4));
    it('MANAGER is level 3', () => expect(getRoleHierarchyLevel('MANAGER')).toBe(3));
    it('TECHNICIAN is level 2', () => expect(getRoleHierarchyLevel('TECHNICIAN')).toBe(2));
    it('VIEWER is level 1', () => expect(getRoleHierarchyLevel('VIEWER')).toBe(1));
    it('unknown role is level 0', () => expect(getRoleHierarchyLevel('OTHER' as any)).toBe(0));
  });

  describe('canManageUsers', () => {
    it('ADMIN can manage users', () => expect(canManageUsers('ADMIN')).toBe(true));
    it('MANAGER can manage users', () => expect(canManageUsers('MANAGER')).toBe(true));
    it('TECHNICIAN cannot manage users', () => expect(canManageUsers('TECHNICIAN')).toBe(false));
    it('VIEWER cannot manage users', () => expect(canManageUsers('VIEWER')).toBe(false));
  });

  describe('canModifyUser', () => {
    it('can modify self regardless of role', () => {
      expect(canModifyUser('VIEWER', 'VIEWER', true)).toBe(true);
      expect(canModifyUser('TECHNICIAN', 'TECHNICIAN', true)).toBe(true);
    });

    it('ADMIN can modify any lower role', () => {
      expect(canModifyUser('ADMIN', 'MANAGER', false)).toBe(true);
      expect(canModifyUser('ADMIN', 'VIEWER', false)).toBe(true);
    });

    it('cannot modify equal or higher role', () => {
      expect(canModifyUser('MANAGER', 'ADMIN', false)).toBe(false);
      expect(canModifyUser('TECHNICIAN', 'MANAGER', false)).toBe(false);
      expect(canModifyUser('VIEWER', 'TECHNICIAN', false)).toBe(false);
    });
  });

  describe('AuthorizationError', () => {
    it('creates error with message and code', () => {
      const err = new AuthorizationError('No permission', 'FORBIDDEN');
      expect(err.message).toBe('No permission');
      expect(err.code).toBe('FORBIDDEN');
      expect(err.name).toBe('AuthorizationError');
    });

    it('default code is FORBIDDEN', () => {
      const err = new AuthorizationError('Denied');
      expect(err.code).toBe('FORBIDDEN');
    });
  });

  describe('requirePermission', () => {
    it('does not throw when role has permission', () => {
      expect(() => requirePermission('ADMIN', 'canCreateUsers')).not.toThrow();
    });

    it('throws AuthorizationError when role lacks permission', () => {
      expect(() => requirePermission('VIEWER', 'canCreateUsers')).toThrow(AuthorizationError);
    });

    it('uses custom message when provided', () => {
      expect(() => requirePermission('VIEWER', 'canCreateUsers', 'Custom error')).toThrow('Custom error');
    });
  });

  describe('requireAdmin', () => {
    it('does not throw for ADMIN', () => {
      expect(() => requireAdmin('ADMIN')).not.toThrow();
    });

    it('throws for non-admin roles', () => {
      expect(() => requireAdmin('MANAGER')).toThrow(AuthorizationError);
      expect(() => requireAdmin('TECHNICIAN')).toThrow(AuthorizationError);
      expect(() => requireAdmin('VIEWER')).toThrow(AuthorizationError);
    });
  });

  describe('requireAdminOrManager', () => {
    it('does not throw for ADMIN or MANAGER', () => {
      expect(() => requireAdminOrManager('ADMIN')).not.toThrow();
      expect(() => requireAdminOrManager('MANAGER')).not.toThrow();
    });

    it('throws for TECHNICIAN or VIEWER', () => {
      expect(() => requireAdminOrManager('TECHNICIAN')).toThrow(AuthorizationError);
      expect(() => requireAdminOrManager('VIEWER')).toThrow(AuthorizationError);
    });
  });

  describe('validateTenantAccess', () => {
    it('does not throw when tenant IDs match', () => {
      expect(() => validateTenantAccess('tenant-1', 'tenant-1')).not.toThrow();
    });

    it('throws when tenant IDs mismatch', () => {
      expect(() => validateTenantAccess('tenant-1', 'tenant-2')).toThrow(AuthorizationError);
    });

    it('throws when resource has no tenant', () => {
      expect(() => validateTenantAccess('tenant-1', null)).toThrow(/no tiene tenant/);
    });
  });

  describe('ticket action permissions', () => {
    it('requireTicketActionPermission allows ADMIN all actions', () => {
      expect(() => requireTicketActionPermission('ADMIN', 'take')).not.toThrow();
      expect(() => requireTicketActionPermission('ADMIN', 'delete' as any)).toThrow(AuthorizationError);
    });

    it('requireTicketActionPermission blocks VIEWER from all actions', () => {
      expect(() => requireTicketActionPermission('VIEWER', 'take')).toThrow(AuthorizationError);
      expect(() => requireTicketActionPermission('VIEWER', 'resolve')).toThrow(AuthorizationError);
    });

    it('canPerformTicketAction returns correct booleans', () => {
      expect(canPerformTicketAction('ADMIN', 'take')).toBe(true);
      expect(canPerformTicketAction('VIEWER', 'take')).toBe(false);
      expect(canPerformTicketAction('TECHNICIAN', 'assign')).toBe(false);
      expect(canPerformTicketAction('MANAGER', 'assign')).toBe(true);
    });
  });

  describe('role metadata', () => {
    it('ROLE_LABELS has all roles', () => {
      expect(ROLE_LABELS.ADMIN).toBe('Administrador');
      expect(ROLE_LABELS.MANAGER).toBe('Gerente');
      expect(ROLE_LABELS.TECHNICIAN).toBe('Técnico');
      expect(ROLE_LABELS.VIEWER).toBe('Visualizador');
    });

    it('ROLE_DESCRIPTIONS has all roles', () => {
      expect(ROLE_DESCRIPTIONS.ADMIN).toContain('Control total');
      expect(ROLE_DESCRIPTIONS.VIEWER).toContain('Solo');
    });

    it('ROLE_COLORS has bg and text for all roles', () => {
      expect(ROLE_COLORS.ADMIN.bg).toBeDefined();
      expect(ROLE_COLORS.ADMIN.text).toBeDefined();
    });
  });

  describe('getSelectableRoles', () => {
    it('returns all four roles', () => {
      const roles = getSelectableRoles();
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('MANAGER');
      expect(roles).toContain('TECHNICIAN');
      expect(roles).toContain('VIEWER');
      expect(roles).toHaveLength(4);
    });
  });

  describe('getAssignableRoles', () => {
    it('ADMIN can assign all lower roles', () => {
      const roles = getAssignableRoles('ADMIN');
      expect(roles).toEqual(['MANAGER', 'TECHNICIAN', 'VIEWER']);
    });

    it('MANAGER can assign TECHNICIAN and VIEWER', () => {
      const roles = getAssignableRoles('MANAGER');
      expect(roles).toEqual(['TECHNICIAN', 'VIEWER']);
    });

    it('VIEWER cannot assign any role', () => {
      const roles = getAssignableRoles('VIEWER');
      expect(roles).toEqual([]);
    });
  });
});
