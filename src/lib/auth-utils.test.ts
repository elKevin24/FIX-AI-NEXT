import { describe, it, expect } from 'vitest';
import { hasPermission } from './auth-utils';
import { UserRole } from '@prisma/client';

describe('auth-utils permissions', () => {
  it('ADMIN should have canManageTemplates permission', () => {
    expect(hasPermission('ADMIN' as UserRole, 'canManageTemplates')).toBe(true);
  });

  it('TECHNICIAN should NOT have canManageTemplates permission', () => {
    expect(hasPermission('TECHNICIAN' as UserRole, 'canManageTemplates')).toBe(false);
  });

  it('RECEPTIONIST should NOT have canManageTemplates permission', () => {
    expect(hasPermission('RECEPTIONIST' as UserRole, 'canManageTemplates')).toBe(false);
  });
});
