import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  processRefund,
  cancelCreditNote,
  getCreditNoteStats,
  getPOSSaleForReturn,
  searchSalesForReturn,
} from './credit-note-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');

const mockSession = {
  user: { id: 'usr-1', tenantId: 'tnt-1', role: 'ADMIN', name: 'Admin' },
};

let state: {
  creditNotes: Map<string, any>;
  sales: Map<string, any>;
  parts: Map<string, any>;
  lastCreditNoteNumber: string | null;
};

function makeDb() {
  return {
    pOSSale: {
      findUnique: vi.fn(({ where }: any) => {
        const sale = state.sales.get(where.id);
        if (!sale) return null;
        return {
          ...sale,
          creditNotes: Array.from(state.creditNotes.values()).filter(
            (cn) => cn.posSaleId === sale.id
          ),
        };
      }),
      findMany: vi.fn(({ where }: any) => {
        let arr = Array.from(state.sales.values());
        if (where?.status?.in) arr = arr.filter((s) => where.status.in.includes(s.status));
        if (where?.OR) {
          arr = arr.filter((s) =>
            where.OR.some((c: any) =>
              (c.saleNumber?.contains && s.saleNumber?.includes(c.saleNumber.contains)) ||
              (c.customerName?.contains && s.customerName?.includes(c.customerName.contains))
            )
          );
        }
        return arr.map((s) => ({
          id: s.id,
          saleNumber: s.saleNumber,
          customerName: s.customerName,
          total: s.total,
          status: s.status,
          createdAt: s.createdAt,
        }));
      }),
      update: vi.fn(({ where, data }: any) => {
        const s = state.sales.get(where.id);
        if (s) {
          Object.assign(s, data);
          state.sales.set(where.id, s);
        }
        return s;
      }),
    },
    creditNote: {
      findFirst: vi.fn(({ where }: any) => {
        if (where?.creditNoteNumber?.startsWith) {
          return state.lastCreditNoteNumber
            ? { creditNoteNumber: state.lastCreditNoteNumber }
            : null;
        }
        return null;
      }),
      findUnique: vi.fn(({ where }: any) => state.creditNotes.get(where.id) || null),
      findMany: vi.fn(({ where }: any) => {
        let arr = Array.from(state.creditNotes.values());
        if (where?.status?.not) arr = arr.filter((cn) => cn.status !== where.status.not);
        if (where?.posSaleId) arr = arr.filter((cn) => cn.posSaleId === where.posSaleId);
        return arr;
      }),
      create: vi.fn(({ data }: any) => {
        const id = `cn-${state.creditNotes.size + 1}`;
        const cn = {
          id,
          ...data,
          creditNoteNumber: data.creditNoteNumber,
          status: 'PENDING',
          createdAt: new Date(),
          items: (data.items?.create || []).map((item: any, i: number) => ({
            id: `cni-${i}`,
            ...item,
            part: state.parts.get(item.partId) || { id: item.partId, name: 'Part', sku: 'SKU' },
          })),
          posSale: state.sales.get(data.posSaleId)
            ? { id: data.posSaleId, saleNumber: state.sales.get(data.posSaleId)?.saleNumber }
            : { id: data.posSaleId, saleNumber: 'POS-0000' },
          createdBy: { id: data.createdById, name: 'Admin' },
          processedBy: null,
        };
        state.creditNotes.set(id, cn);
        state.lastCreditNoteNumber = data.creditNoteNumber;
        return cn;
      }),
      update: vi.fn(({ where, data }: any) => {
        const cn = state.creditNotes.get(where.id);
        if (cn) {
          Object.assign(cn, data);
          state.creditNotes.set(where.id, cn);
        }
        return cn;
      }),
      count: vi.fn((args?: any) => {
        const where = args?.where;
        let arr = Array.from(state.creditNotes.values());
        if (where?.status) arr = arr.filter((cn) => cn.status === where.status);
        if (where?.createdAt?.gte) arr = arr.filter((cn) => cn.createdAt >= where.createdAt.gte);
        if (where?.status?.not) arr = arr.filter((cn) => cn.status !== where.status.not);
        return arr.length;
      }),
      aggregate: vi.fn(({ where }: any) => {
        let arr = Array.from(state.creditNotes.values());
        if (where?.status) arr = arr.filter((cn) => cn.status === where.status);
        return { _sum: { total: arr.reduce((s, cn) => s + cn.total, 0) } };
      }),
    },
    part: {
      update: vi.fn(({ where, data }: any) => {
        const p = state.parts.get(where.id);
        if (p) {
          const newQty = data.quantity?.increment
            ? p.quantity + data.quantity.increment
            : data.quantity?.decrement
              ? p.quantity - data.quantity.decrement
              : p.quantity;
          Object.assign(p, { quantity: newQty });
          state.parts.set(where.id, p);
        }
        return p;
      }),
    },
  };
}

function seedSale(overrides = {}) {
  const sale = {
    id: 'sale-1',
    saleNumber: 'POS-2025-00001',
    customerId: 'cust-1',
    customerName: 'Lucía Méndez',
    customerPhone: '5555-6789',
    customerEmail: 'lucia@example.com',
    subtotal: 200,
    discountAmount: 0,
    taxRate: 12,
    taxAmount: 24,
    total: 224,
    status: 'COMPLETED',
    createdById: 'usr-1',
    tenantId: 'tnt-1',
    items: [
      {
        id: 'si-1',
        partId: 'part-1',
        quantity: 3,
        unitPrice: 50,
        discount: 0,
        part: { id: 'part-1', name: 'Keyboard', price: 50, sku: 'KB-001' },
      },
      {
        id: 'si-2',
        partId: 'part-2',
        quantity: 1,
        unitPrice: 50,
        discount: 0,
        part: { id: 'part-2', name: 'Mouse', price: 50, sku: 'MS-001' },
      },
    ],
    payments: [{ method: 'CASH', amount: 224 }],
    customer: { id: 'cust-1', name: 'Lucía Méndez', email: 'lucia@example.com', phone: '5555-6789' },
    ...overrides,
  };
  state.sales.set(sale.id, sale);
  return sale;
}

describe('Credit Note Integration — Full Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getTenantPrisma).mockReturnValue(makeDb() as any);

    state = {
      creditNotes: new Map(),
      sales: new Map(),
      parts: new Map([
        ['part-1', { id: 'part-1', name: 'Keyboard', quantity: 10, price: 50, sku: 'KB-001' }],
        ['part-2', { id: 'part-2', name: 'Mouse', quantity: 5, price: 50, sku: 'MS-001' }],
      ]),
      lastCreditNoteNumber: null,
    };
  });

  it('CN-01: create credit note and restore stock', async () => {
    seedSale();

    const cn = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Cliente devolvió 2 teclados',
      items: [{ partId: 'part-1', quantity: 2, unitPrice: 50 }],
      notes: 'Devolución parcial',
    });

    expect(cn.success).toBe(true);
    expect(cn.data.status).toBe('PENDING');
    expect(cn.data.items).toHaveLength(1);

    expect(state.parts.get('part-1')?.quantity).toBe(12);
  });

  it('CN-02: reject creation for VOIDED sale', async () => {
    seedSale({ status: 'VOIDED' });
    await expect(
      createCreditNote({
        posSaleId: 'sale-1',
        reason: 'Test',
        items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
      })
    ).rejects.toThrow('No se puede crear una nota de crédito para una venta anulada');
  });

  it('CN-03: reject if item not in original sale', async () => {
    seedSale();
    await expect(
      createCreditNote({
        posSaleId: 'sale-1',
        reason: 'Test',
        items: [{ partId: 'nonexistent-part', quantity: 1, unitPrice: 50 }],
      })
    ).rejects.toThrow('no está en la venta original');
  });

  it('CN-04: reject if quantity exceeds available', async () => {
    seedSale();
    await expect(
      createCreditNote({
        posSaleId: 'sale-1',
        reason: 'Test',
        items: [{ partId: 'part-1', quantity: 99, unitPrice: 50 }],
      })
    ).rejects.toThrow('Cantidad a devolver excede lo disponible');
  });

  it('CN-05: process refund', async () => {
    seedSale();
    const created = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Defecto de fábrica',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
    });

    const refund = await processRefund({
      creditNoteId: created.data.id,
      refundMethod: 'CASH' as any,
      refundReference: 'REF-001',
    });

    expect(refund.success).toBe(true);
    const stored = state.creditNotes.get(created.data.id);
    expect(stored.status).toBe('PROCESSED');
    expect(stored.refundReference).toBe('REF-001');
  });

  it('CN-06: reject processing non-PENDING credit note', async () => {
    seedSale();
    const created = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
    });
    await processRefund({ creditNoteId: created.data.id, refundMethod: 'CASH' as any });

    await expect(
      processRefund({ creditNoteId: created.data.id, refundMethod: 'CASH' as any })
    ).rejects.toThrow('Solo se pueden procesar notas de crédito pendientes');
  });

  it('CN-07: cancel credit note and reverse stock', async () => {
    seedSale();
    const created = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Devolución',
      items: [{ partId: 'part-1', quantity: 2, unitPrice: 50 }],
    });
    const stockAfterCreate = state.parts.get('part-1')?.quantity;
    expect(stockAfterCreate).toBe(12);

    await cancelCreditNote(created.data.id, 'El cliente cambió de opinión');
    const stored = state.creditNotes.get(created.data.id);
    expect(stored.status).toBe('CANCELLED');
    expect(stored.notes).toContain('cambió de opinión');

    expect(state.parts.get('part-1')?.quantity).toBe(10);
  });

  it('CN-08: reject cancel if not PENDING', async () => {
    seedSale();
    const created = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
    });
    await processRefund({ creditNoteId: created.data.id, refundMethod: 'CASH' as any });

    await expect(
      cancelCreditNote(created.data.id, 'Late')
    ).rejects.toThrow('Solo se pueden cancelar notas de crédito pendientes');
  });

  it('CN-09: get credit note stats', async () => {
    seedSale();
    await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
    });

    const stats = await getCreditNoteStats();
    expect(stats.totalCreditNotes).toBe(1);
    expect(stats.pendingCreditNotes).toBe(1);
  });

  it('CN-10: search sales for return', async () => {
    seedSale();
    const results = await searchSalesForReturn('Lucía');
    expect(results).toHaveLength(1);
    expect(results[0].saleNumber).toBe('POS-2025-00001');
  });

  it('CN-11: search returns empty for short query', async () => {
    const results = await searchSalesForReturn('L');
    expect(results).toHaveLength(0);
  });

  it('CN-12: getPOSSaleForReturn returns sale with available quantities', async () => {
    seedSale();
    const sale = await getPOSSaleForReturn('sale-1');
    expect(sale.status).toBe('COMPLETED');
    expect(sale.items).toHaveLength(2);

    const kbItem = sale.items.find((i: any) => i.partId === 'part-1');
    expect(kbItem.availableForReturn).toBe(3);
    expect(kbItem.returnedQuantity).toBe(0);
  });

  it('CN-13: getPOSSaleForReturn reflects already returned quantities', async () => {
    seedSale();
    await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Devolvió 1 teclado',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50 }],
    });

    const sale = await getPOSSaleForReturn('sale-1');
    const kbItem = sale.items.find((i: any) => i.partId === 'part-1');
    expect(kbItem.returnedQuantity).toBe(1);
    expect(kbItem.availableForReturn).toBe(2);
  });

  it('CN-14: full lifecycle create → process → verify stats', async () => {
    seedSale();

    const created = await createCreditNote({
      posSaleId: 'sale-1',
      reason: 'Producto defectuoso',
      items: [
        { partId: 'part-1', quantity: 1, unitPrice: 50 },
        { partId: 'part-2', quantity: 1, unitPrice: 50 },
      ],
    });
    expect(created.success).toBe(true);

    const detail = await getCreditNoteById(created.data.id);
    expect(detail.reason).toBe('Producto defectuoso');
    expect(detail.items).toHaveLength(2);

    const list = await getCreditNotes();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('PENDING');

    await processRefund({ creditNoteId: created.data.id, refundMethod: 'TRANSFER' as any });

    const stats = await getCreditNoteStats();
    expect(stats.pendingCreditNotes).toBe(0);
    expect(stats.processedThisMonth).toBe(1);
    expect(stats.totalRefundedAmount).toBeGreaterThan(0);
  });
});
