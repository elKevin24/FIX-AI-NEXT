import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSuperAdmin } from '@/lib/authz';

describe('isSuperAdmin authorization helper', () => {
    const originalEnv = process.env['SUPERADMIN_EMAILS'];

    beforeEach(() => {
        process.env['SUPERADMIN_EMAILS'] = 'superadmin@fixworkshop.com, owner@example.com ';
    });

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env['SUPERADMIN_EMAILS'] = originalEnv;
        } else {
            delete process.env['SUPERADMIN_EMAILS'];
        }
    });

    it('returns false for undefined or null user', () => {
        expect(isSuperAdmin(undefined)).toBe(false);
        expect(isSuperAdmin(null)).toBe(false);
    });

    it('returns true when user.role is SUPER_ADMIN', () => {
        expect(isSuperAdmin({ id: '1', role: 'SUPER_ADMIN', email: 'user@other.com' })).toBe(true);
    });

    it('returns true when user.role is SUPERADMIN (alias)', () => {
        expect(isSuperAdmin({ id: '2', role: 'SUPERADMIN', email: 'user@other.com' })).toBe(true);
    });

    it('returns false for standard ADMIN, TECHNICIAN or VIEWER without matching email', () => {
        expect(isSuperAdmin({ id: '3', role: 'ADMIN', email: 'admin@tenant.com' })).toBe(false);
        expect(isSuperAdmin({ id: '4', role: 'TECHNICIAN', email: 'tech@tenant.com' })).toBe(false);
        expect(isSuperAdmin({ id: '5', role: 'VIEWER', email: 'viewer@tenant.com' })).toBe(false);
    });

    it('returns false if user has no email and role is not superadmin', () => {
        expect(isSuperAdmin({ id: '6', role: 'ADMIN', email: null })).toBe(false);
        expect(isSuperAdmin({ id: '7', role: 'ADMIN', email: undefined })).toBe(false);
    });
});
