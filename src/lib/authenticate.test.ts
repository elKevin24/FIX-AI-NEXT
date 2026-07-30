import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignIn = vi.hoisted(() => vi.fn());
const mockAuthError = vi.hoisted(() => {
  class AuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
    }
  }
  return { AuthError };
});

vi.mock('@/auth', () => ({
  signIn: mockSignIn,
  auth: vi.fn(),
}));

vi.mock('next-auth', () => ({
  AuthError: mockAuthError.AuthError,
}));

import { authenticate } from './actions';

function formDataFrom(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when signIn succeeds', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const fd = formDataFrom({ email: 'a@b.com', password: '123456' });
    const result = await authenticate(undefined, fd);
    expect(result).toEqual({ success: true, message: 'Redirecting...' });
  });

  it('returns invalid credentials on CredentialsSignin error', async () => {
    mockSignIn.mockRejectedValue(new mockAuthError.AuthError('CredentialsSignin'));
    const fd = formDataFrom({ email: 'bad@b.com', password: 'wrong' });
    const result = await authenticate(undefined, fd);
    expect(result).toEqual({ success: false, message: 'Invalid credentials.' });
  });

  it('returns generic error on other AuthError', async () => {
    mockSignIn.mockRejectedValue(new mockAuthError.AuthError('SomeOtherError'));
    const fd = formDataFrom({ email: 'a@b.com', password: '123456' });
    const result = await authenticate(undefined, fd);
    expect(result).toEqual({ success: false, message: 'Something went wrong.' });
  });

  it('re-throws non-AuthError exceptions', async () => {
    mockSignIn.mockRejectedValue(new Error('DB down'));
    const fd = formDataFrom({ email: 'a@b.com', password: '123456' });
    await expect(authenticate(undefined, fd)).rejects.toThrow('DB down');
  });
});
