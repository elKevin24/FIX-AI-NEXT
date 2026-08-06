import { describe, it, expect } from 'vitest';
import { authConfig } from './auth.config';

function mockAuth(user: any) {
  return user ? { user, expires: new Date().toISOString() } : null;
}

function mockRequest(pathname: string) {
  return { nextUrl: new URL(pathname, 'http://localhost:3000') } as any;
}

describe('auth.config authorized callback', () => {
  const authorized = authConfig.callbacks.authorized;

  it('allows access to dashboard when logged in', () => {
    const result = authorized({
      auth: mockAuth({ id: 'u1', role: 'ADMIN' }),
      request: mockRequest('/dashboard'),
    });
    expect(result).toBe(true);
  });

  it('blocks access to dashboard when not logged in', () => {
    const result = authorized({
      auth: mockAuth(null),
      request: mockRequest('/dashboard'),
    });
    expect(result).toBe(false);
  });

  it('redirects logged-in users from login page to dashboard', () => {
    const result = authorized({
      auth: mockAuth({ id: 'u1', role: 'ADMIN' }),
      request: mockRequest('/login'),
    }) as Response;
    expect(result.headers.get('Location')).toBe('http://localhost:3000/dashboard');
  });

  it('allows access to public pages when not logged in', () => {
    const result = authorized({
      auth: mockAuth(null),
      request: mockRequest('/'),
    });
    expect(result).toBe(true);
  });

  it('redirects logged-in users from public pages to dashboard', () => {
    const result = authorized({
      auth: mockAuth({ id: 'u1' }),
      request: mockRequest('/about'),
    }) as Response;
    expect(result.headers.get('Location')).toBe('http://localhost:3000/dashboard');
  });

  it('blocks sub-paths of dashboard when not logged in', () => {
    const result = authorized({
      auth: mockAuth(null),
      request: mockRequest('/dashboard/settings'),
    });
    expect(result).toBe(false);
  });
});
