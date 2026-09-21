import { describe, it, expect, vi } from 'vitest';
import { GET as healthGET } from './route';
import { GET as readyGET } from '../ready/route';
import { prisma } from '@/lib/prisma';

describe('Health & Readiness Probes', () => {
  it('GET /health returns 200 with status ok and uptime', async () => {
    const response = await healthGET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(data.service).toBe('fix-ai-workshop');
    expect(data.timestamp).toBeDefined();
  });

  it('GET /ready returns 200 with database connected when DB is reachable', async () => {
    const originalQueryRaw = (prisma as any).$queryRaw;
    (prisma as any).$queryRaw = vi.fn().mockResolvedValue([{ 1: 1 }]);

    const response = await readyGET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ready');
    expect(data.database).toBe('connected');
    expect(data.timestamp).toBeDefined();

    (prisma as any).$queryRaw = originalQueryRaw;
  });

  it('GET /ready returns 503 when database query throws', async () => {
    const originalQueryRaw = (prisma as any).$queryRaw;
    (prisma as any).$queryRaw = vi.fn().mockRejectedValue(new Error('Connection timeout'));

    const response = await readyGET();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe('not_ready');
    expect(data.database).toBe('disconnected');

    // Restore
    (prisma as any).$queryRaw = originalQueryRaw;
  });
});
