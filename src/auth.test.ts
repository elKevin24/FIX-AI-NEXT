import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: { findMany: vi.fn() },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

import { handlers, auth, signIn, signOut } from './auth';

describe('auth module', () => {
  it('exports handlers', () => {
    expect(handlers).toBeDefined();
  });

  it('exports auth function', () => {
    expect(typeof auth).toBe('function');
  });

  it('exports signIn function', () => {
    expect(typeof signIn).toBe('function');
  });

  it('exports signOut function', () => {
    expect(typeof signOut).toBe('function');
  });
});
