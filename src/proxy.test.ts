import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from './proxy';
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

vi.mock('@/auth');

function createMockRequest(urlStr: string, method: string = 'GET', ip: string = '127.0.0.1'): NextRequest {
  const url = new URL(urlStr);
  const req = new NextRequest(url, {
    method,
    headers: {
      'x-forwarded-for': ip,
    },
  });
  return req;
}

describe('Proxy Middleware Routing & Auth Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user from /dashboard to /login with callbackUrl', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = createMockRequest('http://localhost:3000/dashboard/tickets');
    const response = await proxy(req);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/login?callbackUrl=%2Fdashboard%2Ftickets');
  });

  it('returns 401 for unauthenticated internal API requests', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const req = createMockRequest('http://localhost:3000/api/tickets');
    const response = await proxy(req);

    expect(response.status).toBe(401);
  });

  it('allows public API endpoints without authentication (/api/health, /api/ready, /api/auth)', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    
    const healthReq = createMockRequest('http://localhost:3000/api/health');
    const healthRes = await proxy(healthReq);
    expect(healthRes.status).toBe(200);

    const readyReq = createMockRequest('http://localhost:3000/api/ready');
    const readyRes = await proxy(readyReq);
    expect(readyRes.status).toBe(200);
  });

  it('redirects authenticated user from /login to /dashboard', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', passwordMustChange: false },
    } as any);

    const req = createMockRequest('http://localhost:3000/login');
    const response = await proxy(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('redirects authenticated user requiring password change to /dashboard/profile/change-password', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', passwordMustChange: true },
    } as any);

    const req = createMockRequest('http://localhost:3000/dashboard/tickets');
    const response = await proxy(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard/profile/change-password');
  });

  it('allows user requiring password change to access the change-password page itself', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', passwordMustChange: true },
    } as any);

    const req = createMockRequest('http://localhost:3000/dashboard/profile/change-password');
    const response = await proxy(req);

    expect(response.status).toBe(200);
  });
});
