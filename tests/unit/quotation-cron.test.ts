import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkExpiringQuotations } from '@/lib/quotation-cron';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pOSQuotation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const TENANT_ID = 'tenant-1';
const QUOTATION_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('checkExpiringQuotations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero when no quotations are expired', async () => {
    (prisma.pOSQuotation.findMany as any).mockResolvedValue([]);

    const result = await checkExpiringQuotations(TENANT_ID);

    expect(result).toEqual({ tenantId: TENANT_ID, expiredCount: 0 });
    expect(prisma.pOSQuotation.updateMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('expires quotations past validUntil', async () => {
    const quotations = [
      { id: QUOTATION_ID, quotationNumber: 'COT-2026-00001' },
      { id: '550e8400-e29b-41d4-a716-446655440001', quotationNumber: 'COT-2026-00002' },
    ];

    (prisma.pOSQuotation.findMany as any).mockResolvedValue(quotations);
    (prisma.pOSQuotation.updateMany as any).mockResolvedValue({ count: 2 });
    (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-1' });

    const result = await checkExpiringQuotations(TENANT_ID);

    expect(result).toEqual({ tenantId: TENANT_ID, expiredCount: 2 });
    expect(prisma.pOSQuotation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [QUOTATION_ID, '550e8400-e29b-41d4-a716-446655440001'] } },
      data: { status: 'EXPIRED' },
    });
  });

  it('creates audit log for each expired quotation', async () => {
    const quotations = [
      { id: QUOTATION_ID, quotationNumber: 'COT-2026-00001' },
    ];

    (prisma.pOSQuotation.findMany as any).mockResolvedValue(quotations);
    (prisma.pOSQuotation.updateMany as any).mockResolvedValue({ count: 1 });
    (prisma.auditLog.create as any).mockResolvedValue({ id: 'log-1' });

    await checkExpiringQuotations(TENANT_ID);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'TICKET_STATUS_CHANGED',
        module: 'POS',
        entityType: 'QUOTATION',
        entityId: QUOTATION_ID,
        metadata: {
          quotationNumber: 'COT-2026-00001',
          previousStatus: 'DRAFT/SENT',
          newStatus: 'EXPIRED',
          reason: 'VALID_UNTIL_EXCEEDED',
        },
        tenantId: TENANT_ID,
        success: true,
      },
    });
  });

  it('only finds DRAFT or SENT quotations', async () => {
    (prisma.pOSQuotation.findMany as any).mockResolvedValue([]);

    await checkExpiringQuotations(TENANT_ID);

    expect(prisma.pOSQuotation.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        status: { in: ['DRAFT', 'SENT'] },
        validUntil: { lt: expect.any(Date) },
      },
      select: { id: true, quotationNumber: true },
    });
  });
});
