import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveTicketParts, rejectTicketParts } from '@/lib/actions/ticket-actions';
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
  notifyPartsApprovalRequired: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { notifyTicketStatusChange } from '@/lib/ticket-notifications';

const SESSION = {
  user: {
    id: 'user-1',
    tenantId: 'tenant-1',
    role: 'ADMIN',
    email: 'admin@electrofix.com',
  },
};

const TICKET_ID = '550e8400-e29b-41d4-a716-446655440000';

function formDataFrom(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

function makeTx(overrides: Record<string, any> = {}) {
  return {
    ticket: {
      findUnique: vi.fn().mockResolvedValue({
        id: TICKET_ID,
        tenantId: 'tenant-1',
        status: 'WAITING_APPROVAL',
        ticketNumber: 'TICK-0001',
        title: 'Reparación',
        customerId: 'customer-1',
        assignedToId: null,
        customer: { id: 'customer-1', name: 'Cliente A', email: 'cliente@test.com' },
        assignedTo: null,
      }),
      update: vi.fn().mockResolvedValue({ id: TICKET_ID }),
    },
    partUsage: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
    ...overrides,
  };
}

const PENDING_USAGES = [
  {
    id: 'usage-1',
    ticketId: TICKET_ID,
    partId: 'part-1',
    quantity: 2,
    approved: false,
    priceAtProposal: 150,
    part: { id: 'part-1', name: 'Batería' },
  },
];

describe('approveTicketParts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza si no hay sesión', async () => {
    (auth as any).mockResolvedValue(null);
    const result = await approveTicketParts(null, formDataFrom({ ticketId: TICKET_ID }));
    expect(result).toEqual({ success: false, message: 'No autorizado' });
  });

  it('aprueba los repuestos pendientes y marca el ticket IN_PROGRESS', async () => {
    const tx = makeTx();
    tx.partUsage.findMany.mockResolvedValue(PENDING_USAGES);
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await approveTicketParts(null, formDataFrom({ ticketId: TICKET_ID }));

    expect(result.success).toBe(true);
    for (const usage of PENDING_USAGES) {
      expect(tx.partUsage.update).toHaveBeenCalledWith({
        where: { id: usage.id },
        data: {
          approved: true,
          approvedAt: expect.any(Date),
          approvedById: 'user-1',
        },
      });
    }
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID, tenantId: 'tenant-1' },
      data: { status: 'IN_PROGRESS', updatedById: 'user-1' },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PARTS_APPROVED', entityId: TICKET_ID }),
      }),
    );
  });

  it('no cambia el estado si el ticket no estaba WAITING_APPROVAL', async () => {
    const tx = makeTx();
    tx.partUsage.findMany.mockResolvedValue(PENDING_USAGES);
    tx.ticket.findUnique.mockResolvedValue({
      id: TICKET_ID, tenantId: 'tenant-1', status: 'IN_PROGRESS', ticketNumber: 'TICK-0001', title: 'Reparación',
      customerId: 'customer-1', assignedToId: null,
      customer: { id: 'customer-1', name: 'Cliente A', email: 'cliente@test.com' }, assignedTo: null,
    });
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    await approveTicketParts(null, formDataFrom({ ticketId: TICKET_ID }));

    expect(tx.ticket.update).not.toHaveBeenCalled();
  });

  it('falla si no hay repuestos pendientes', async () => {
    const tx = makeTx();
    tx.partUsage.findMany.mockResolvedValue([]);
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await approveTicketParts(null, formDataFrom({ ticketId: TICKET_ID }));

    expect(result.success).toBe(false);
    expect(result.message).toContain('No hay repuestos pendientes');
    expect(tx.partUsage.update).not.toHaveBeenCalled();
  });
});

describe('rejectTicketParts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue(SESSION);
  });

  it('rechaza si no hay sesión', async () => {
    (auth as any).mockResolvedValue(null);
    const result = await rejectTicketParts(null, formDataFrom({ ticketId: TICKET_ID, reason: 'Motivo de rechazo' }));
    expect(result).toEqual({ success: false, message: 'No autorizado' });
  });

  it('rechaza motivo menor a 10 caracteres', async () => {
    const tx = makeTx();
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await rejectTicketParts(null, formDataFrom({ ticketId: TICKET_ID, reason: 'Corto' }));

    expect(result.success).toBe(false);
    expect(result.message).toContain('10 caracteres');
    expect(tx.partUsage.delete).not.toHaveBeenCalled();
  });

  it('elimina los repuestos pendientes y marca el ticket REJECTED', async () => {
    const tx = makeTx();
    tx.partUsage.findMany.mockResolvedValue(PENDING_USAGES);
    const tenantDb = { $transaction: vi.fn(async (cb: any) => cb(tx)) };
    (getTenantPrisma as any).mockReturnValue(tenantDb);

    const result = await rejectTicketParts(null, formDataFrom({ ticketId: TICKET_ID, reason: 'El cliente no autoriza el costo propuesto' }));

    expect(result.success).toBe(true);
    for (const usage of PENDING_USAGES) {
      expect(tx.partUsage.delete).toHaveBeenCalledWith({ where: { id: usage.id } });
    }
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID, tenantId: 'tenant-1' },
      data: {
        status: 'REJECTED',
        cancellationReason: 'El cliente no autoriza el costo propuesto',
        updatedById: 'user-1',
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PARTS_REJECTED', entityId: TICKET_ID }),
      }),
    );
    expect(notifyTicketStatusChange).toHaveBeenCalled();
  });
});
