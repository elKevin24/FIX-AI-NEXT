import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReportData } from './report-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');

describe('Report Actions', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      role: 'ADMIN',
    },
  };

  const mockDb: any = {
    ticket: {
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    pOSSale: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    part: {
      aggregate: vi.fn(),
    },
    pOSSaleItem: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(mockSession);
    (getTenantPrisma as any).mockReturnValue(mockDb);
  });

  it('debería lanzar error si el usuario no tiene sesión', async () => {
    (auth as any).mockResolvedValueOnce(null);
    await expect(getReportData()).rejects.toThrow('No autorizado');
  });

  it('debería lanzar error si el usuario es TECHNICIAN (RBAC)', async () => {
    (auth as any).mockResolvedValueOnce({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'TECHNICIAN' }
    });
    await expect(getReportData()).rejects.toThrow('Solo los administradores pueden generar reportes');
  });

  it('debería lanzar error si el usuario es VIEWER (RBAC)', async () => {
    (auth as any).mockResolvedValueOnce({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'VIEWER' }
    });
    await expect(getReportData()).rejects.toThrow('Solo los administradores pueden generar reportes');
  });

  it('should return aggregated report data correctly', async () => {
    mockDb.ticket.groupBy.mockResolvedValue([{ status: 'OPEN', _count: { id: 5 } }]);
    mockDb.user.findMany.mockResolvedValue([
      { id: 'tech-1', name: 'Tech 1', assignedTickets: [{ status: 'RESOLVED' }, { status: 'OPEN' }] }
    ]);
    mockDb.invoice.aggregate.mockResolvedValue({
      _sum: { total: 1000, laborCost: 500, partsCost: 500 }
    });
    mockDb.pOSSale.aggregate.mockResolvedValue({
      _sum: { total: 200 }
    });
    mockDb.invoice.findMany.mockResolvedValue([{ total: 1000, issuedAt: new Date() }]);
    mockDb.pOSSale.findMany.mockResolvedValue([{ total: 200, createdAt: new Date() }]);
    mockDb.part.aggregate.mockResolvedValue({
      _count: { id: 50 }, _sum: { quantity: 200 }
    });
    mockDb.pOSSaleItem.findMany.mockResolvedValue([
      { part: { name: 'Part A' }, quantity: 2, unitPrice: 10, discount: 0 }
    ]);

    const result = await getReportData();

    expect(result.ticketsByStatus).toEqual([{ status: 'OPEN', count: 5 }]);
    expect(result.technicianMetrics).toEqual([
      { name: 'Tech 1', closed: 1, active: 1, total: 2 }
    ]);
    expect(result.finances.totalRevenue).toBe(1200);
    expect(result.inventory.topSelling).toHaveLength(1);
    expect(result.inventory.topSelling[0].name).toBe('Part A');
    expect(result.inventory.topSelling[0].total).toBe(20);
  });
});
