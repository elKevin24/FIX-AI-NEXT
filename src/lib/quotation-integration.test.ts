import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
  convertQuotationToSale,
  duplicateQuotation,
  deleteQuotation,
} from './quotation-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('next/cache');
vi.mock('./tenant-settings-actions', () => ({
  getTaxRate: () => Promise.resolve(12),
  getTenantSettingsForDocuments: () => Promise.resolve({ businessName: 'FIX-AI', address: 'GT', taxId: 'CF' }),
}));

const mockSession = {
  user: { id: 'usr-1', tenantId: 'tnt-1', role: 'ADMIN', name: 'Admin' },
};

let state: {
  quotations: Map<string, any>;
  sales: Map<string, any>;
  parts: Map<string, any>;
  lastQuotationNumber: string | null;
  lastSaleNumber: string | null;
};

const makeDb = () => ({
  pOSQuotation: {
    findFirst: vi.fn(({ where, orderBy }: any) => {
      if (where?.quotationNumber?.startsWith) {
        if (!state.lastQuotationNumber) return null;
        return { quotationNumber: state.lastQuotationNumber };
      }
      if (where?.status) {
        return Array.from(state.quotations.values()).find(q =>
          q.status === where.status
        ) || null;
      }
      return null;
    }),
    findUnique: vi.fn(({ where }: any) => state.quotations.get(where.id) || null),
    findMany: vi.fn(({ where }: any) => {
      let arr = Array.from(state.quotations.values());
      if (where?.status) arr = arr.filter(q => q.status === where.status);
      if (where?.customerId) arr = arr.filter(q => q.customerId === where.customerId);
      if (where?.OR) arr = arr.filter(q =>
        where.OR.some((c: any) =>
          (c.quotationNumber?.contains && q.quotationNumber?.includes(c.quotationNumber.contains)) ||
          (c.customerName?.contains && q.customerName?.includes(c.customerName.contains))
        )
      );
      return arr;
    }),
    create: vi.fn(({ data }: any) => {
      const id = `qt-${state.quotations.size + 1}`;
      const q = {
        id, ...data,
        quotationNumber: data.quotationNumber,
        status: 'DRAFT',
        createdAt: new Date(),
        items: (data.items?.create || []).map((item: any, i: number) => ({
          id: `qi-${i}`, ...item, part: state.parts.get(item.partId) || { id: item.partId, name: 'Part', price: item.unitPrice, quantity: 10 }
        })),
        customer: data.customerId ? { id: data.customerId, name: data.customerName || '', email: null } : null,
        createdBy: { id: data.createdById, name: 'Admin' },
        convertedToSale: null,
      };
      state.quotations.set(id, q);
      state.lastQuotationNumber = data.quotationNumber;
      return q;
    }),
    update: vi.fn(({ where, data }: any) => {
      const q = state.quotations.get(where.id);
      if (q) { Object.assign(q, data); state.quotations.set(where.id, q); }
      return q;
    }),
    delete: vi.fn(({ where }: any) => state.quotations.delete(where.id)),
    count: vi.fn(({ where }: any) => {
      let arr = Array.from(state.quotations.values());
      if (where?.status?.in) arr = arr.filter(q => where.status.in.includes(q.status));
      if (where?.createdAt?.gte) arr = arr.filter(q => q.createdAt >= where.createdAt.gte);
      return arr.length;
    }),
    updateMany: vi.fn(({ where, data }: any) => {
      let count = 0;
      state.quotations.forEach((q, id) => {
        if (where?.status?.in?.includes(q.status) && where?.validUntil?.lt && new Date(q.validUntil) < where.validUntil.lt) {
          Object.assign(q, data);
          state.quotations.set(id, q);
          count++;
        }
      });
      return { count };
    }),
  },
  pOSSale: {
    findFirst: vi.fn(({ where }: any) => {
      if (where?.saleNumber?.startsWith) {
        if (!state.lastSaleNumber) return null;
        return { saleNumber: state.lastSaleNumber };
      }
      return null;
    }),
    create: vi.fn(({ data }: any) => {
      const id = `sale-${state.sales.size + 1}`;
      const sale = { id, ...data, createdAt: new Date() };
      state.sales.set(id, sale);
      state.lastSaleNumber = data.saleNumber;
      return sale;
    }),
  },
  part: {
    findMany: vi.fn(({ where }: any) => {
      if (where?.id?.in) return where.id.in.map((id: string) => state.parts.get(id)).filter(Boolean);
      return Array.from(state.parts.values());
    }),
    update: vi.fn(({ where, data }: any) => {
      const p = state.parts.get(where.id);
      if (p) { Object.assign(p, data); state.parts.set(where.id, p); }
      return p;
    }),
  },
});

describe('Quotation Integration — Full Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getTenantPrisma).mockReturnValue(makeDb() as any);

    state = {
      quotations: new Map(),
      sales: new Map(),
      parts: new Map([['part-1', { id: 'part-1', name: 'Motherboard', price: 350, quantity: 5 }]]),
      lastQuotationNumber: null,
      lastSaleNumber: null,
    };
  });

  it('COT-01: create → send → accept → convert to sale', async () => {
    const created = await createQuotation({
      customerId: 'cust-1',
      customerName: 'Carlos López',
      items: [{ partId: 'part-1', quantity: 2, unitPrice: 350, discount: 10 }],
      globalDiscount: 5,
      validDays: 30,
    });
    expect(created.success).toBe(true);
    const qId = created.data.id;

    const list = await getQuotations();
    expect(list).toHaveLength(1);
    expect(list[0]!.status).toBe('DRAFT');

    await updateQuotationStatus(qId, 'SENT' as any);
    expect(state.quotations.get(qId)?.status).toBe('SENT');

    await updateQuotationStatus(qId, 'ACCEPTED' as any);
    expect(state.quotations.get(qId)?.status).toBe('ACCEPTED');

    const sale = await convertQuotationToSale({
      quotationId: qId,
      payments: [{ method: 'CASH' as any, amount: 670.32 }],
    });
    expect(sale.success).toBe(true);
    expect(state.quotations.get(qId)?.status).toBe('CONVERTED');
    expect(state.sales.size).toBe(1);
  });

  it('COT-02: reject conversion if not ACCEPTED', async () => {
    const created = await createQuotation({
      customerName: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 100, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    await expect(convertQuotationToSale({
      quotationId: created.data.id,
      payments: [{ method: 'CASH' as any, amount: 112 }],
    })).rejects.toThrow('Solo se pueden convertir cotizaciones aceptadas');
  });

  it('COT-03: reject invalid transition DRAFT → CONVERTED directly', async () => {
    const created = await createQuotation({
      customerName: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    await expect(updateQuotationStatus(created.data.id, 'CONVERTED' as any)).rejects.toThrow(
      'No se puede cambiar el estado'
    );
  });

  it('COT-04: reject invalid transition SENT → DRAFT', async () => {
    const created = await createQuotation({
      customerName: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    await updateQuotationStatus(created.data.id, 'SENT' as any);
    await expect(updateQuotationStatus(created.data.id, 'DRAFT' as any)).rejects.toThrow(
      'No se puede cambiar el estado'
    );
  });

  it('COT-05: reject invalid transition ACCEPTED → SENT', async () => {
    const created = await createQuotation({
      customerName: 'Test',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    await updateQuotationStatus(created.data.id, 'SENT' as any);
    await updateQuotationStatus(created.data.id, 'ACCEPTED' as any);
    await expect(updateQuotationStatus(created.data.id, 'SENT' as any)).rejects.toThrow(
      'No se puede cambiar el estado'
    );
  });

  it('COT-06: duplicate a quotation', async () => {
    await createQuotation({
      customerName: 'Original',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 100, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    const original = Array.from(state.quotations.values())[0];
    const dup = await duplicateQuotation(original.id);
    expect(dup.success).toBe(true);
    expect(state.quotations.size).toBe(2);
    expect(dup.data.notes).toContain('Duplicado');
  });

  it('COT-07: delete DRAFT only', async () => {
    const created = await createQuotation({
      customerName: 'To Delete',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });

    const result = await deleteQuotation(created.data.id);
    expect(result.success).toBe(true);
    expect(state.quotations.size).toBe(0);
  });

  it('COT-08: prevent delete non-DRAFT', async () => {
    const created = await createQuotation({
      customerName: 'Sent Quotation',
      items: [{ partId: 'part-1', quantity: 1, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    await updateQuotationStatus(created.data.id, 'SENT' as any);
    await expect(deleteQuotation(created.data.id)).rejects.toThrow(
      'Solo se pueden eliminar cotizaciones en borrador'
    );
  });

  it('COT-09: sequential numbering', async () => {
    const q1 = await createQuotation({ customerName: 'A', items: [{ partId: 'part-1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 });
    const q2 = await createQuotation({ customerName: 'B', items: [{ partId: 'part-1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 });
    const q3 = await createQuotation({ customerName: 'C', items: [{ partId: 'part-1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 });

    const num1 = parseInt(q1.data.quotationNumber.split('-')[2] as string);
    const num2 = parseInt(q2.data.quotationNumber.split('-')[2] as string);
    const num3 = parseInt(q3.data.quotationNumber.split('-')[2] as string);
    expect(num2).toBe(num1 + 1);
    expect(num3).toBe(num2 + 1);
  });

  it('COT-10: filter quotations by status and search', async () => {
    await createQuotation({ customerName: 'Alpha', items: [{ partId: 'part-1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 });
    const beta = await createQuotation({ customerName: 'Beta', items: [{ partId: 'part-1', quantity: 1, unitPrice: 10, discount: 0 }], validDays: 15, globalDiscount: 0 });
    await updateQuotationStatus(beta.data.id, 'SENT' as any);

    const drafts = await getQuotations({ status: 'DRAFT' as any });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.customerName).toBe('Alpha');
  });

  it('COT-11: getQuotationById returns full details with items', async () => {
    const created = await createQuotation({
      customerName: 'Detail Test',
      customerEmail: 'test@example.com',
      items: [{ partId: 'part-1', quantity: 3, unitPrice: 50, discount: 0 }],
      validDays: 15,
      globalDiscount: 0,
    });
    const detail = await getQuotationById(created.data.id);
    expect(detail.customerName).toBe('Detail Test');
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]!.quantity).toBe(3);
  });
});
