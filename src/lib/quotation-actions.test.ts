import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
  convertQuotationToSale,
  duplicateQuotation,
  deleteQuotation,
  getQuotationStats,
  markExpiredQuotations,
} from './quotation-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');

const mockSession = {
  user: { id: 'usr-1', tenantId: 'tnt-1', role: 'ADMIN', name: 'Admin' },
};

const mockDb = {
  pOSQuotation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
  pOSSale: { findFirst: vi.fn(), create: vi.fn() },
  part: { findMany: vi.fn(), update: vi.fn() },
  tenantSettings: { findUnique: vi.fn().mockResolvedValue({ taxRate: 13 }) },
};

const mockQuotation = {
  id: 'qt-1',
  quotationNumber: 'COT-2025-00001',
  customerId: 'cust-1',
  customerName: 'Juan Pérez',
  customerPhone: '5555-1234',
  customerEmail: 'juan@example.com',
  subtotal: 100,
  discountAmount: 10,
  taxRate: 12,
  taxAmount: 10.8,
  total: 100.8,
  notes: null,
  validUntil: new Date('2025-02-15'),
  status: 'DRAFT',
  createdById: 'usr-1',
  tenantId: 'tnt-1',
  createdAt: new Date('2025-01-15'),
  items: [
    { id: 'item-1', partId: 'part-1', quantity: 2, unitPrice: 50, discount: 0, part: { id: 'part-1', name: 'Part A', price: 50, quantity: 10 } },
  ],
  customer: { id: 'cust-1', name: 'Juan Pérez', email: 'juan@example.com' },
  createdBy: { id: 'usr-1', name: 'Admin' },
  convertedToSale: null,
};

describe('quotation-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getTenantPrisma).mockReturnValue(mockDb as any);
  });

  describe('createQuotation', () => {
    it('creates a quotation with valid data', async () => {
      mockDb.pOSQuotation.findFirst.mockResolvedValue(null);
      mockDb.part.findMany.mockResolvedValue([
        { id: 'part-1', name: 'Part A', price: 50, quantity: 10 },
      ]);
      mockDb.pOSQuotation.create.mockResolvedValue(mockQuotation);

      const result = await createQuotation({
        customerId: 'cust-1',
        items: [{ partId: 'part-1', quantity: 2, unitPrice: 50, discount: 0 }],
        notes: 'Test',
        validDays: 15,
        globalDiscount: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('throws when unauthorized', async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      await expect(createQuotation({ items: [{ partId: 'p1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 }))
        .rejects.toThrow('No autorizado');
    });

    it('throws when parts not found', async () => {
      mockDb.part.findMany.mockResolvedValue([]);
      await expect(createQuotation({
        items: [{ partId: 'nonexistent', quantity: 1, unitPrice: 10, discount: 0 }],
        validDays: 15,
        globalDiscount: 0,
      })).rejects.toThrow('Uno o más productos no fueron encontrados');
    });

    it('uses default tax rate when not provided', async () => {
      mockDb.pOSQuotation.findFirst.mockResolvedValue(null);
      mockDb.part.findMany.mockResolvedValue([{ id: 'part-1', name: 'Part A', price: 50, quantity: 10 }]);
      mockDb.pOSQuotation.create.mockResolvedValue(mockQuotation);

      const result = await createQuotation({
        items: [{ partId: 'part-1', quantity: 1, unitPrice: 100, discount: 0 }],
        validDays: 15,
        globalDiscount: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getQuotations', () => {
    it('returns quotations list', async () => {
      mockDb.pOSQuotation.findMany.mockResolvedValue([mockQuotation]);
      const result = await getQuotations();
      expect(result).toHaveLength(1);
      expect(result[0]!.quotationNumber).toBe('COT-2025-00001');
    });

    it('filters by status', async () => {
      await getQuotations({ status: 'DRAFT' as any });
      expect(mockDb.pOSQuotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'DRAFT' }) })
      );
    });

    it('filters by search', async () => {
      await getQuotations({ search: 'Juan' });
      const call = mockDb.pOSQuotation.findMany.mock.calls[0]![0];
      expect(call.where.OR).toBeDefined();
    });

    it('filters by date range', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');
      await getQuotations({ startDate: start, endDate: end });
      const call = mockDb.pOSQuotation.findMany.mock.calls[0]![0];
      expect(call.where.createdAt).toBeDefined();
    });

    it('throws when unauthorized', async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      await expect(getQuotations()).rejects.toThrow('No autorizado');
    });
  });

  describe('getQuotationById', () => {
    it('returns quotation details', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue(mockQuotation);
      const result = await getQuotationById('qt-1');
      expect(result.id).toBe('qt-1');
      expect(result.subtotal).toBe(100);
    });

    it('throws when not found', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue(null);
      await expect(getQuotationById('nonexistent')).rejects.toThrow('Cotización no encontrada');
    });
  });

  describe('updateQuotationStatus', () => {
    it('updates status with valid transition', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ status: 'DRAFT' });
      mockDb.pOSQuotation.update.mockResolvedValue({ ...mockQuotation, status: 'SENT' });
      const result = await updateQuotationStatus('qt-1', 'SENT' as any);
      expect(result.success).toBe(true);
    });

    it('throws for invalid transition', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ status: 'DRAFT' });
      await expect(updateQuotationStatus('qt-1', 'CONVERTED' as any)).rejects.toThrow(
        'No se puede cambiar el estado'
      );
    });

    it('throws when quotation not found', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue(null);
      await expect(updateQuotationStatus('nonexistent', 'SENT' as any)).rejects.toThrow('Cotización no encontrada');
    });

    it('blocks transition from ACCEPTED to DRAFT', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ status: 'ACCEPTED' });
      await expect(updateQuotationStatus('qt-1', 'DRAFT' as any)).rejects.toThrow(Error);
    });
  });

  describe('convertQuotationToSale', () => {
    it('converts ACCEPTED quotation to sale', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({
        ...mockQuotation,
        status: 'ACCEPTED',
        items: [{ partId: 'part-1', quantity: 1, unitPrice: 100, discount: 0, part: { name: 'Part A', quantity: 10, price: 100 } }],
      });
      mockDb.pOSSale.findFirst.mockResolvedValue(null);
      mockDb.pOSSale.create.mockResolvedValue({ id: 'sale-1', saleNumber: 'POS-2025-00001' });

      const result = await convertQuotationToSale({
        quotationId: 'qt-1',
        payments: [{ method: 'CASH' as any, amount: 100.8 }],
      });
      expect(result.success).toBe(true);
    });

    it('throws when quotation is not ACCEPTED', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ ...mockQuotation, status: 'DRAFT' });
      await expect(convertQuotationToSale({
        quotationId: 'qt-1',
        payments: [{ method: 'CASH' as any, amount: 100 }],
      })).rejects.toThrow('Solo se pueden convertir cotizaciones aceptadas');
    });

    it('throws on insufficient stock', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({
        ...mockQuotation,
        status: 'ACCEPTED',
        items: [{ partId: 'part-1', quantity: 99, unitPrice: 50, discount: 0, part: { name: 'Part A', quantity: 1, price: 50 } }],
      });
      await expect(convertQuotationToSale({
        quotationId: 'qt-1',
        payments: [{ method: 'CASH' as any, amount: 100 }],
      })).rejects.toThrow('Stock insuficiente');
    });

    it('throws on payment mismatch', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({
        ...mockQuotation,
        status: 'ACCEPTED',
        items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0, part: { name: 'Part A', quantity: 10, price: 50 } }],
      });
      await expect(convertQuotationToSale({
        quotationId: 'qt-1',
        payments: [{ method: 'CASH' as any, amount: 1 }],
      })).rejects.toThrow('no coincide con el total');
    });
  });

  describe('duplicateQuotation', () => {
    it('duplicates a quotation as DRAFT', async () => {
      mockDb.pOSQuotation.findFirst.mockResolvedValue(null);
      mockDb.pOSQuotation.findUnique.mockResolvedValue(mockQuotation);
      mockDb.pOSQuotation.create.mockResolvedValue({ ...mockQuotation, id: 'qt-dup', quotationNumber: 'COT-2025-00002' });
      const result = await duplicateQuotation('qt-1');
      expect(result.success).toBe(true);
    });

    it('throws when original not found', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue(null);
      await expect(duplicateQuotation('nonexistent')).rejects.toThrow('Cotización no encontrada');
    });
  });

  describe('deleteQuotation', () => {
    it('deletes DRAFT quotation', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ status: 'DRAFT' });
      const result = await deleteQuotation('qt-1');
      expect(result.success).toBe(true);
    });

    it('throws when deleting non-DRAFT', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue({ status: 'SENT' });
      await expect(deleteQuotation('qt-1')).rejects.toThrow('Solo se pueden eliminar cotizaciones en borrador');
    });

    it('throws when not found', async () => {
      mockDb.pOSQuotation.findUnique.mockResolvedValue(null);
      await expect(deleteQuotation('nonexistent')).rejects.toThrow('Cotización no encontrada');
    });
  });

  describe('getQuotationStats', () => {
    it('returns statistics', async () => {
      mockDb.pOSQuotation.count.mockResolvedValue(10);
      const result = await getQuotationStats();
      expect(result.totalQuotations).toBe(10);
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markExpiredQuotations', () => {
    it('marks expired quotations', async () => {
      mockDb.pOSQuotation.updateMany.mockResolvedValue({ count: 3 });
      const result = await markExpiredQuotations();
      expect(result.expiredCount).toBe(3);
    });

    it('throws when there is no session', async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      await expect(markExpiredQuotations()).rejects.toThrow('No autorizado');
    });
  });
});
