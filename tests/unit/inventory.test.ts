import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addPartToTicket, removePartFromTicket } from '@/lib/actions/ticket-actions';
import { receivePurchaseOrder, addPurchaseItem } from '@/lib/purchase-actions';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

vi.mock('@/auth');
vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: vi.fn() } },
}));
vi.mock('@/lib/ticket-notifications', () => ({
  notifyLowStock: vi.fn(),
  notifyTicketCreated: vi.fn(),
  notifyTicketStatusChange: vi.fn(),
  notifyTechnicianAssigned: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { notifyLowStock } from '@/lib/ticket-notifications';

const SESSION = {
  user: {
    id: 'user-1',
    tenantId: 'tenant-1',
    role: 'ADMIN',
    email: 'admin@electrofix.com',
  },
};

const TICKET_ID = '550e8400-e29b-41d4-a716-446655440000';
const PART_ID = '550e8400-e29b-41d4-a716-446655440001';

function formDataFrom(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

function makeTx(overrides: Record<string, any> = {}) {
  return {
    ticket: {
      findUnique: vi.fn().mockResolvedValue({ id: TICKET_ID, tenantId: 'tenant-1' }),
    },
    part: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: PART_ID }),
    },
    partUsage: {
      create: vi.fn().mockResolvedValue({ id: 'usage-1' }),
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: 'usage-1' }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: 'admin-1' }]),
    },
    purchaseOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  };
}

describe('addPartToTicket (cálculos de inventario)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza si no hay sesión', async () => {
    (auth as any).mockResolvedValue(null);
    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '1' }));
    expect(result).toEqual({ success: false, message: 'No autorizado' });
  });

  it('rechaza quantity inválido (0, negativo o ausente)', async () => {
    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '0' }));
    expect(result).toEqual({ success: false, message: 'Datos inválidos' });
  });

  it('rechaza stock insuficiente con detalle de disponibilidad', async () => {
    const tx = makeTx();
    tx.part.findUnique.mockResolvedValue({ id: PART_ID, tenantId: 'tenant-1', quantity: 2 });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '5' }));

    expect(result.success).toBe(false);
    expect(result.message).toContain('Stock insuficiente');
    expect(result.message).toContain('Disponible: 2');
    expect(tx.partUsage.create).not.toHaveBeenCalled();
    expect(tx.part.update).not.toHaveBeenCalled();
  });

  it('rechaza repuesto de otro tenant', async () => {
    const tx = makeTx();
    tx.part.findUnique.mockResolvedValue({ id: PART_ID, tenantId: 'tenant-OTRO', quantity: 100 });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '1' }));
    expect(result.success).toBe(false);
    expect(result.message).toBe('No autorizado');
  });

  it('crea partUsage y decrementa stock cuando hay inventario', async () => {
    const tx = makeTx();
    tx.part.findUnique.mockResolvedValue({ id: PART_ID, tenantId: 'tenant-1', quantity: 10 });
    tx.part.findUnique.mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 10 });
    tx.part.findUnique.mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 9, name: 'Batería', minStock: 2 });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '1' }));

    expect(result.success).toBe(true);
    expect(tx.partUsage.create).toHaveBeenCalledWith({
      data: { ticketId: TICKET_ID, partId: PART_ID, quantity: 1 },
    });
  });

  it('notifica stock bajo cuando quantity <= minStock', async () => {
    const tx = makeTx();
    tx.part.findUnique
      .mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 3 })
      .mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 2, name: 'Batería', minStock: 3 });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '1' }));

    expect(result.success).toBe(true);
    expect(notifyLowStock).toHaveBeenCalled();
  });

  it('NO notifica stock bajo cuando quantity > minStock', async () => {
    const tx = makeTx();
    tx.part.findUnique
      .mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 10 })
      .mockResolvedValueOnce({ id: PART_ID, tenantId: 'tenant-1', quantity: 9, name: 'Batería', minStock: 2 });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    await addPartToTicket(null, formDataFrom({ ticketId: TICKET_ID, partId: PART_ID, quantity: '1' }));

    expect(notifyLowStock).not.toHaveBeenCalled();
  });
});

describe('removePartFromTicket (restauración de stock)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza sin usageId', async () => {
    const result = await removePartFromTicket(null, formDataFrom({}));
    expect(result).toEqual({ success: false, message: 'ID de uso requerido' });
  });

  it('restaura stock incrementando la cantidad del repuesto', async () => {
    const tx = makeTx();
    tx.partUsage.findUnique.mockResolvedValue({
      id: 'usage-1',
      partId: PART_ID,
      quantity: 3,
      ticket: { tenantId: 'tenant-1' },
      part: { tenantId: 'tenant-1' },
    });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await removePartFromTicket(null, formDataFrom({ usageId: 'usage-1' }));

    expect(result.success).toBe(true);
    expect(tx.partUsage.delete).toHaveBeenCalledWith({ where: { id: 'usage-1' } });
  });

  it('rechaza si el uso es de otro tenant', async () => {
    const tx = makeTx();
    tx.partUsage.findUnique.mockResolvedValue({
      id: 'usage-1',
      partId: PART_ID,
      quantity: 1,
      ticket: { tenantId: 'tenant-OTRO' },
      part: { tenantId: 'tenant-OTRO' },
    });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await removePartFromTicket(null, formDataFrom({ usageId: 'usage-1' }));
    expect(result.success).toBe(false);
    expect(result.message).toBe('No autorizado');
    expect(tx.part.update).not.toHaveBeenCalled();
  });
});

describe('receivePurchaseOrder (incremento de inventario)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza a usuarios que no son ADMIN', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'TECHNICIAN' },
    });
    const result = await receivePurchaseOrder('order-1');
    expect(result).toEqual({ success: false, message: 'Permiso denegado' });
  });

  it('incrementa stock de cada item y marca la orden RECEIVED', async () => {
    const txDb = makeTx();
    txDb.purchaseOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      items: [
        { partId: PART_ID, quantity: 4, unitCost: 10 },
        { partId: '550e8400-e29b-41d4-a716-446655440002', quantity: 2, unitCost: 15 },
      ],
    });
    const db = { $transaction: vi.fn(async (cb: any) => cb(txDb)) };
    (getTenantPrisma as any).mockImplementation((tenantId: string, userId?: string, tx?: any) =>
      tx ? txDb : db,
    );

    const result = await receivePurchaseOrder('order-1');

    expect(result.success).toBe(true);
    expect(txDb.part.update).toHaveBeenCalledTimes(2);
    expect(txDb.part.update).toHaveBeenCalledWith({
      where: { id: PART_ID },
      data: { quantity: { increment: 4 }, cost: 10, updatedById: 'user-1' },
    });
    expect(txDb.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'RECEIVED', receivedDate: expect.any(Date), updatedById: 'user-1' },
    });
  });

  it('falla si la orden no está PENDING', async () => {
    const txDb = makeTx();
    txDb.purchaseOrder.findUnique.mockResolvedValue({ id: 'order-1', status: 'RECEIVED', items: [] });
    const db = { $transaction: vi.fn(async (cb: any) => cb(txDb)) };
    (getTenantPrisma as any).mockImplementation((tenantId: string, userId?: string, tx?: any) =>
      tx ? txDb : db,
    );

    const result = await receivePurchaseOrder('order-1');
    expect(result.success).toBe(false);
    expect(txDb.part.update).not.toHaveBeenCalled();
  });
});

describe('addPurchaseItem (validación)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza cantidad <= 0 o costo negativo', async () => {
    expect(await addPurchaseItem('order-1', PART_ID, 0, 5)).toEqual({
      success: false,
      message: 'Cantidad o costo inválidos',
    });
    expect(await addPurchaseItem('order-1', PART_ID, 5, -1)).toEqual({
      success: false,
      message: 'Cantidad o costo inválidos',
    });
  });

  it('rechaza a no ADMIN', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    });
    expect(await addPurchaseItem('order-1', PART_ID, 2, 5)).toEqual({
      success: false,
      message: 'Permiso denegado',
    });
  });
});
