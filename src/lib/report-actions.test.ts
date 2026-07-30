import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReportData } from './report-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

// Mock dependencias
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/tenant-prisma', () => ({ getTenantPrisma: vi.fn() }));

describe('report-actions', () => {
    const mockDb = {
        ticket: { groupBy: vi.fn() },
        user: { findMany: vi.fn() },
        invoice: { aggregate: vi.fn(), findMany: vi.fn() },
        pOSSale: { aggregate: vi.fn(), findMany: vi.fn() },
        part: { aggregate: vi.fn() },
        pOSSaleItem: { groupBy: vi.fn() }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (getTenantPrisma as any).mockReturnValue(mockDb);

        // Default mock responses to avoid destructuring errors
        mockDb.ticket.groupBy.mockResolvedValue([]);
        mockDb.user.findMany.mockResolvedValue([]);
        mockDb.invoice.aggregate.mockResolvedValue({ _sum: { total: 0, laborCost: 0, partsCost: 0 } });
        mockDb.pOSSale.aggregate.mockResolvedValue({ _sum: { total: 0 } });
        mockDb.invoice.findMany.mockResolvedValue([]);
        mockDb.pOSSale.findMany.mockResolvedValue([]);
        mockDb.part.aggregate.mockResolvedValue({ _count: { id: 0 }, _sum: { quantity: 0 } });
        mockDb.pOSSaleItem.groupBy.mockResolvedValue([]);
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

    it('debería procesar correctamente el reporte si el usuario es ADMIN', async () => {
        (auth as any).mockResolvedValueOnce({
            user: { id: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' }
        });

        const result = await getReportData();
        
        expect(result).toBeDefined();
        expect(result.finances).toBeDefined();
        expect(result.inventory).toBeDefined();
        
        // Verifica que llamó a prisma
        expect(mockDb.ticket.groupBy).toHaveBeenCalled();
        expect(mockDb.invoice.aggregate).toHaveBeenCalled();
    });
});
