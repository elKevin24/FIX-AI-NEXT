import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { getCurrentUser, getTenantId, requireAuth } from './auth-helpers';
import { redirect } from 'next/navigation';

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('returns user when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'u1', tenantId: 't1', role: 'ADMIN', email: 'a@b.com' },
      });
      const user = await getCurrentUser();
      expect(user).toBeDefined();
      expect(user!.id).toBe('u1');
      expect(user!.tenantId).toBe('t1');
    });

    it('returns undefined when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const user = await getCurrentUser();
      expect(user).toBeUndefined();
    });
  });

  describe('getTenantId', () => {
    it('returns tenantId when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'u1', tenantId: 't1' },
      });
      const tid = await getTenantId();
      expect(tid).toBe('t1');
    });

    it('throws when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      await expect(getTenantId()).rejects.toThrow(/No tenant ID/);
    });

    it('throws when tenantId is missing', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'u1' } });
      await expect(getTenantId()).rejects.toThrow(/No tenant ID/);
    });
  });

  describe('requireAuth', () => {
    it('returns session when authenticated', async () => {
      const session = { user: { id: 'u1', tenantId: 't1' } };
      mockAuth.mockResolvedValue(session);
      const result = await requireAuth();
      expect(result).toBe(session);
    });

    it('redirects to /login when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      await requireAuth();
      expect(redirect).toHaveBeenCalledWith('/login');
    });
  });
});
