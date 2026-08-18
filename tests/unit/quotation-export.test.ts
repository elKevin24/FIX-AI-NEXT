import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/tenant-prisma', () => ({
  getTenantPrisma: vi.fn(),
}));

const SESSION = {
  user: {
    id: 'user-1',
    tenantId: 'tenant-1',
  },
};

const QUOTATIONS = [
  {
    id: 'q1',
    quotationNumber: 'COT-2026-00001',
    customerName: 'Carlos López',
    customerEmail: 'carlos@test.com',
    customerPhone: '0991234567',
    subtotal: 100,
    taxAmount: 12,
    discountAmount: 5,
    total: 107,
    status: 'SENT',
    validUntil: new Date('2026-09-01'),
    createdAt: new Date('2026-08-15'),
  },
];

function makeDb() {
  let callCount = 0;
  return {
    pOSQuotation: {
      findMany: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount > 1) return [];
        return QUOTATIONS;
      }),
    },
  };
}

import { GET } from '@/app/api/export/quotations/route';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

describe('GET /api/export/quotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/export/quotations');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('streams CSV with correct headers', async () => {
    (auth as any).mockResolvedValue(SESSION);
    const db = makeDb();
    (getTenantPrisma as any).mockReturnValue(db);

    const req = new NextRequest('http://localhost/api/export/quotations');
    const res = await GET(req);

    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment; filename="cotizaciones-/);
  });

  it('includes CSV header row and data row', async () => {
    (auth as any).mockResolvedValue(SESSION);
    const db = makeDb();
    (getTenantPrisma as any).mockReturnValue(db);

    const req = new NextRequest('http://localhost/api/export/quotations');
    const res = await GET(req);

    const body = await res.text();
    const lines = body.trim().split('\n');

    expect(lines[0]).toContain('Número de Cotización');
    expect(lines[1]).toContain('COT-2026-00001');
    expect(lines[1]).toContain('Carlos López');
  });

  it('passes valid filters to query', async () => {
    (auth as any).mockResolvedValue(SESSION);
    const db = makeDb();
    (getTenantPrisma as any).mockReturnValue(db);

    const url = 'http://localhost/api/export/quotations?startDate=2026-01-01&endDate=2026-12-31&status=SENT';
    const req = new NextRequest(url);
    const res = await GET(req);

    const reader = res.body!.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(db.pOSQuotation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'SENT',
        }),
      })
    );
  });

  it('returns 400 for invalid status parameter', async () => {
    (auth as any).mockResolvedValue(SESSION);

    const url = 'http://localhost/api/export/quotations?status=INVALID_STATUS';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Parámetros inválidos');
  });

  it('returns 400 for invalid date format', async () => {
    (auth as any).mockResolvedValue(SESSION);

    const url = 'http://localhost/api/export/quotations?startDate=not-a-date';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate is before startDate', async () => {
    (auth as any).mockResolvedValue(SESSION);

    const url = 'http://localhost/api/export/quotations?startDate=2026-12-31&endDate=2026-01-01';
    const req = new NextRequest(url);
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('accepts all valid statuses', async () => {
    (auth as any).mockResolvedValue(SESSION);
    const db = makeDb();
    (getTenantPrisma as any).mockReturnValue(db);

    const statuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED'];
    for (const status of statuses) {
      vi.clearAllMocks();
      (auth as any).mockResolvedValue(SESSION);
      const freshDb = makeDb();
      (getTenantPrisma as any).mockReturnValue(freshDb);

      const url = `http://localhost/api/export/quotations?status=${status}`;
      const req = new NextRequest(url);
      const res = await GET(req);

      expect(res.status).not.toBe(400);
    }
  });
});
