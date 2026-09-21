import { describe, it, expect, vi } from 'vitest';

async function loadAuthz() {
  const { isSuperAdmin } = await import('./authz');
  return isSuperAdmin;
}

describe('isSuperAdmin', () => {
  it('reconoce el rol SUPER_ADMIN / SUPERADMIN', async () => {
    vi.resetModules();
    const isSuperAdmin = await loadAuthz();
    expect(isSuperAdmin({ role: 'SUPER_ADMIN' })).toBe(true);
    expect(isSuperAdmin({ role: 'SUPERADMIN' })).toBe(true);
    expect(isSuperAdmin({ role: 'ADMIN' })).toBe(false);
    expect(isSuperAdmin({ role: 'TECHNICIAN', email: 'tech@electrofix.com' })).toBe(false);
  });

  it('es falso para undefined/null y usuarios sin email', async () => {
    vi.resetModules();
    const isSuperAdmin = await loadAuthz();
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin({ id: 'user-1' })).toBe(false);
  });

  it('resuelve usuarios por la lista SUPERADMIN_EMAILS (case-insensitive)', async () => {
    const previous = process.env['SUPERADMIN_EMAILS'];
    process.env['SUPERADMIN_EMAILS'] = 'super@electrofix.com,another@net.com';
    try {
      vi.resetModules();
      const isSuperAdmin = await loadAuthz();
      expect(isSuperAdmin({ email: 'SUPER@electrofix.com' })).toBe(true);
      expect(isSuperAdmin({ email: 'another@net.com' })).toBe(true);
      expect(isSuperAdmin({ email: 'staff@electrofix.com' })).toBe(false);
      expect(isSuperAdmin({ email: 'super@electrofix.com ' })).toBe(true);
    } finally {
      vi.resetModules();
      if (previous === undefined) {
        delete process.env['SUPERADMIN_EMAILS'];
      } else {
        process.env['SUPERADMIN_EMAILS'] = previous;
      }
    }
  });

  it('es falso cuando SUPERADMIN_EMAILS está vacío o ausente', async () => {
    const previous = process.env['SUPERADMIN_EMAILS'];
    delete process.env['SUPERADMIN_EMAILS'];
    try {
      vi.resetModules();
      const isSuperAdmin = await loadAuthz();
      expect(isSuperAdmin({ email: 'super@electrofix.com' })).toBe(false);
    } finally {
      vi.resetModules();
      if (previous !== undefined) {
        process.env['SUPERADMIN_EMAILS'] = previous;
      }
    }
  });
});