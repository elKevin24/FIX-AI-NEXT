import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { createNotification } from '@/lib/notifications';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { UpdateTicketStatusUseCase } from './UpdateTicketStatusUseCase';

vi.mock('@/lib/tenant-prisma');
vi.mock('@/lib/notifications');
vi.mock('@/lib/ticket-notifications');

const getTenantPrismaMock = vi.mocked(getTenantPrisma);
const notifyTicketStatusChangeMock = vi.mocked(notifyTicketStatusChange);
const createNotificationMock = vi.mocked(createNotification);

const TICKET = {
  id: 'ticket-1',
  ticketNumber: 'TK-0001',
  title: 'Pantalla rota',
  status: 'OPEN' as string,
  tenantId: 'tenant-1',
  customerId: 'customer-1',
  assignedToId: null as string | null,
  partsUsed: [] as Array<{ id: string; ticketId: string }>,
  customer: { id: 'customer-1' },
  assignedTo: null as { id: string } | null,
  deviceType: 'PC',
  deviceModel: 'HP',
};

function makeEnv({ ticket = { ...TICKET } }: { ticket?: any } = {}) {
  const tx = {
    partUsage: { delete: vi.fn().mockResolvedValue({}) },
    ticket: { update: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ticketNote: { create: vi.fn().mockResolvedValue({}) },
  };
  const db = {
    ticket: { findUnique: vi.fn().mockResolvedValue(ticket) },
    $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
  };
  getTenantPrismaMock.mockReturnValue(db as any);
  return { db, tx };
}

const BASE_PARAMS = {
  ticketId: 'ticket-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
};

describe('UpdateTicketStatusUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTenantPrismaMock.mockReset();
  });

  it('lanza NotFoundError si el ticket no existe y no abre transacción', async () => {
    const { db } = makeEnv({ ticket: null });

    await expect(
      UpdateTicketStatusUseCase.execute({ ...BASE_PARAMS, status: 'RESOLVED' as any }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('lanza ValidationError al cancelar sin motivo de al menos 10 caracteres', async () => {
    const { db } = makeEnv();

    await expect(
      UpdateTicketStatusUseCase.execute({ ...BASE_PARAMS, status: 'CANCELLED' as any }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      UpdateTicketStatusUseCase.execute({ ...BASE_PARAMS, status: 'CANCELLED' as any, note: 'corto' }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('cancela: borra partUsages, guarda motivo, nota interna y audit log', async () => {
    const { tx } = makeEnv({
      ticket: { ...TICKET, partsUsed: [{ id: 'pu-1', ticketId: 'ticket-1' }] },
    });
    const note = 'Cliente desistió de la reparación';

    const result = await UpdateTicketStatusUseCase.execute({
      ...BASE_PARAMS,
      status: 'CANCELLED' as any,
      note,
    });

    expect(result).toBe(true);
    expect(tx.partUsage.delete).toHaveBeenCalledWith({
      where: { id: 'pu-1', ticketId: 'ticket-1' },
    });
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1', tenantId: 'tenant-1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        updatedById: 'user-1',
        cancellationReason: note,
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'TICKET_STATUS_CHANGED',
        details: expect.stringContaining('"newStatus":"CANCELLED"'),
      }),
    });
    expect(tx.ticketNote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: note, authorId: 'user-1', isInternal: true }),
    });
    expect(notifyTicketStatusChangeMock).toHaveBeenCalled();
  });

  it('cambia a RESOLVED sin borrar repuestos y notifica el cambio', async () => {
    const { tx } = makeEnv();

    const result = await UpdateTicketStatusUseCase.execute({
      ...BASE_PARAMS,
      status: 'RESOLVED' as any,
    });

    expect(result).toBe(true);
    expect(tx.partUsage.delete).not.toHaveBeenCalled();
    expect(tx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1', tenantId: 'tenant-1' },
      data: expect.objectContaining({ status: 'RESOLVED', updatedById: 'user-1' }),
    });
    expect(tx.ticketNote.create).not.toHaveBeenCalled();
    expect(notifyTicketStatusChangeMock).toHaveBeenCalled();
  });

  it('no notifica si el estado no cambia', async () => {
    const { tx } = makeEnv({ ticket: { ...TICKET, status: 'RESOLVED' } });

    await UpdateTicketStatusUseCase.execute({
      ...BASE_PARAMS,
      status: 'RESOLVED' as any,
    });

    expect(tx.ticket.update).toHaveBeenCalled();
    expect(notifyTicketStatusChangeMock).not.toHaveBeenCalled();
  });

  it('notifica al técnico asignado cuando es distinto del actor', async () => {
    makeEnv({ ticket: { ...TICKET, assignedToId: 'tech-1' } });

    await UpdateTicketStatusUseCase.execute({ ...BASE_PARAMS, status: 'IN_PROGRESS' as any });

    expect(createNotificationMock).toHaveBeenCalledWith({
      userId: 'tech-1',
      tenantId: 'tenant-1',
      type: 'INFO',
      title: 'Estado del Ticket Actualizado',
      message: expect.stringContaining('#TK-0001'),
      link: expect.stringContaining('/dashboard/tickets/ticket-1'),
    });
  });

  it('no notifica al técnico asignado si el actor es el propio técnico', async () => {
    makeEnv({ ticket: { ...TICKET, assignedToId: 'user-1' } });

    await UpdateTicketStatusUseCase.execute({ ...BASE_PARAMS, status: 'IN_PROGRESS' as any });

    expect(createNotificationMock).not.toHaveBeenCalled();
  });
});