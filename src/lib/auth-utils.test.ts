import { describe, it, expect } from 'vitest';
import { hasPermission } from './auth-utils';
import { UserRole } from '@/generated/prisma';

describe('auth-utils permissions', () => {
  it('ADMIN should have canManageTemplates permission', () => {
    expect(hasPermission('ADMIN' as UserRole, 'canManageTemplates')).toBe(true);
  });

  it('MANAGER should have canManageTemplates permission', () => {
    expect(hasPermission('MANAGER' as UserRole, 'canManageTemplates')).toBe(true);
  });

  it('TECHNICIAN should NOT have canManageTemplates permission', () => {
    expect(hasPermission('TECHNICIAN' as UserRole, 'canManageTemplates')).toBe(false);
  });

  it('VIEWER should NOT have canManageTemplates permission', () => {
    expect(hasPermission('VIEWER' as UserRole, 'canManageTemplates')).toBe(false);
  });
});