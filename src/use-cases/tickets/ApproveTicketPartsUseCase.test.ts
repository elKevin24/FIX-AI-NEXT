import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';
import { isSuperAdmin } from '@/lib/authz';
import { ApproveTicketPartsUseCase } from './ApproveTicketPartsUseCase';

vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/ticket-notifications');
vi.mock('@/lib/authz');

const getTenantPrismaMock = vi.mocked(getTenantPrisma);
const notifyTicketStatusChangeMock = vi.mocked(notifyTicketStatusChange);
const isSuperAdminMock = vi.mocked(isSuperAdmin);

const TICKET = {
  id: 'ticket-1',
  ticketNumber: 'TK-0001',
  title: 'Pantalla',
  status: 'WAITING_APPROVAL',
  tenantId: 'tenant-1',
  customerId: 'customer-1',
  assignedToId: null,
  customer: { id: 'customer-1' },
  assignedTo: null,
};

const PENDING = [
  {
    id: 'pu-1',
    ticketId: 'ticket-1',
    partId: 'part-1',
    part: { id: 'part-1', name: 'Motherboard' },
    quantity: 1,
    priceAtProposal: 150.5,
    approved: false,
  },
  {
    id: 'pu-2',
    ticketId: 'ticket-1',
    partId: 'part-2',
    part: { id: 'part-2', name: 'RAM 8GB' },
    quantity: 2,
    priceAtProposal: 55,
    approved: false,
  },
];

function makeEnv({ ticket = { ...TICKET }, pending = PENDING }: { ticket?: any; pending?: any } = {}) {
  const tx = {
    ticket: {
      findUnique: vi.fn().mockResolvedValue(ticket),
      update: vi.fn().mockResolvedValue({}),
    },
    partUsage: {
      findMany: vi.fn().mockResolvedValue(pending),
      update: vi.fn().mockResolvedValue({}),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = { $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)) };
  getTenantPrismaMock.mockReturnValue(db as any);
  return { db, tx };
}

const PARAMS = {
  ticketId: 'ticket-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  email: 'staff@electrofix.com',
};

describe('ApproveTicketPartsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTenantPrismaMock.mockReset();
    isSuperAdminMock.mockReset();
  });

  it('lanza error si el ticket no existe', async () => {
    const { tx } = makeEnv({ ticket: null });

    await expect(ApproveTicketPartsUseCase.execute(PARAMS)).rejects.toThrow('Ticket no encontrado');

    expect(tx.partUsage.findMany).not.toHaveBeenCalled();
  });

  it('bloquea el staff de otro tenant (no superadmin)', async () => {
    isSuperAdminMock.mockReturnValue(false);
    const { tx } = makeEnv({ ticket: { ...TICKET, tenantId: 'tenant-2' } });

    await expect(ApproveTicketPartsUseCase.execute(PARAMS)).rejects.toThrow('No autorizado');

    expect(tx.partUsage.findMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('permite al superadmin aprobar repuestos de otro tenant', async () => {
    isSuperAdminMock.mockReturnValue(true);
    const { tx } = makeEnv({ ticket: { ...TICKET, tenantId: 'tenant-2' } });

    const result = await ApproveTicketPartsUseCase.execute(PARAMS);

    expect(result).toBe(true);
    expect(tx.partUsage.update).toHaveBeenCalledTimes(2);
  });

  it('lanza error si no hay repuestos pendientes de aprobación', async () => {
    isSuperAdminMock.mockReturnValue(false);
    const { tx } = makeEnv({ pending: [] });

    await expect(ApproveTicketPartsUseCase.execute(PARAMS)).rejects.toThrow(
      'No hay repuestos pendientes de aprobación',
    );

    expect(tx.ticket.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('aprueba repuestos, mueve WAITING_APPROVAL → IN_PROGRESS y audita', async () => {
    isSuperAdminMock.mockReturnValue(false);
    const { tx } = makeEnv();

    const result = await ApproveTicketPartsUseCase.execute(PARAMS);

    expect(result).toBe(true);
    for (const usage of PENDING) {
      expect(tx.partUsage.update).toHaveBeenCalledWith({
        where: { id: usage.id },
        data: expect.objectContaining({
          approved: true,
          approvedAt: expect.any(Date),
          approvedById: 'user-1',
        }),
      });
    }
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1', tenantId: 'tenant-1' },
      data: expect.objectContaining({ status: 'IN_PROGRESS', updatedById: 'user-1' }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PARTS_APPROVED',
        details: expect.stringContaining('"name":"Motherboard"'),
      }),
    });
    expect(notifyTicketStatusChangeMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ oldStatus: 'WAITING_APPROVAL', newStatus: 'IN_PROGRESS' }),
    );
  });

  it('no cambia el estado si el ticket ya está en IN_PROGRESS', async () => {
    isSuperAdminMock.mockReturnValue(false);
    const { tx } = makeEnv({ ticket: { ...TICKET, status: 'IN_PROGRESS' } });

    const result = await ApproveTicketPartsUseCase.execute(PARAMS);

    expect(result).toBe(true);
    expect(tx.ticket.update).not.toHaveBeenCalled();
    expect(tx.partUsage.update).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenCalled();
  });
});