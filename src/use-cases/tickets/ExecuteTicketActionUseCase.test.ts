import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecuteTicketActionUseCase } from './ExecuteTicketActionUseCase';
import { UserRole } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { AuthorizationError } from '@/lib/auth-utils';

describe('ExecuteTicketActionUseCase (Design Patterns: Strategy & State Machine Pipeline)', () => {
  const mockStatusNotifier = vi.fn().mockResolvedValue(undefined);
  const mockTechNotifier = vi.fn().mockResolvedValue(undefined);

  const baseTicket = {
    id: 'ticket-1',
    ticketNumber: 'TK-001',
    title: 'Laptop display repair',
    status: 'OPEN',
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    customer: { id: 'cust-1', name: 'Ana Gómez', email: 'ana@example.com' },
    assignedToId: null,
    assignedTo: null,
  };

  const mockTx = {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...baseTicket, ...data })
      ),
    },
    user: {
      findFirst: vi.fn(),
    },
    partUsage: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    part: {
      update: vi.fn().mockResolvedValue({}),
    },
    ticketNote: {
      create: vi.fn().mockResolvedValue({}),
    },
  };

  const mockDb = {
    ticket: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  };

  const baseParams = {
    ticketId: 'ticket-1',
    tenantId: 'tenant-1',
    userId: 'user-tech-1',
    userRole: 'TECHNICIAN' as UserRole,
    userName: 'Tech Mario',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza con AuthorizationError si el rol no tiene permisos para la acción', async () => {
    await expect(
      ExecuteTicketActionUseCase.execute({
        ...baseParams,
        userRole: 'RECEPTIONIST' as UserRole,
        action: 'take', // Receptionists cannot take tickets
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('lanza NotFoundError si el ticket no existe o pertenece a otro tenant', async () => {
    mockDb.ticket.findUnique.mockResolvedValueOnce(null);

    await expect(
      ExecuteTicketActionUseCase.execute(
        { ...baseParams, action: 'take' },
        { db: mockDb }
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rechaza con ValidationError si la transición de estado es inválida según la máquina de estados', async () => {
    // Un ticket OPEN no puede pasar directamente a 'resolve' sin estar IN_PROGRESS
    mockDb.ticket.findUnique.mockResolvedValueOnce(baseTicket);

    await expect(
      ExecuteTicketActionUseCase.execute(
        { ...baseParams, action: 'resolve', note: 'Listo' },
        { db: mockDb }
      )
    ).rejects.toThrow('Transición no permitida');
  });

  it('ejecuta acción "take" validando carga del técnico y moviendo a IN_PROGRESS', async () => {
    mockDb.ticket.findUnique.mockResolvedValueOnce(baseTicket);
    mockTx.ticket.findUnique.mockResolvedValueOnce({ assignedToId: null });
    mockTx.user.findFirst.mockResolvedValueOnce({
      id: 'user-tech-1',
      status: 'AVAILABLE',
      maxConcurrentTickets: 5,
      _count: { assignedTickets: 2 },
    });

    const result = await ExecuteTicketActionUseCase.execute(
      { ...baseParams, action: 'take' },
      {
        db: mockDb,
        statusNotifier: mockStatusNotifier,
        techNotifier: mockTechNotifier,
      }
    );

    expect(result.success).toBe(true);
    expect(mockTx.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          assignedToId: 'user-tech-1',
        }),
      })
    );
    expect(mockStatusNotifier).toHaveBeenCalled();
  });

  it('ejecuta acción "cancel" restaurando repuestos al inventario de forma atómica', async () => {
    const inProgressTicket = { ...baseTicket, status: 'IN_PROGRESS' };
    mockDb.ticket.findUnique.mockResolvedValueOnce(inProgressTicket);

    mockTx.partUsage.findMany.mockResolvedValueOnce([
      { partId: 'part-x', quantity: 2 },
      { partId: 'part-y', quantity: 1 },
    ]);

    const result = await ExecuteTicketActionUseCase.execute(
      {
        ...baseParams,
        userRole: 'ADMIN',
        action: 'cancel',
        cancellationReason: 'Cliente solicitó cancelar servicio',
      },
      {
        db: mockDb,
        statusNotifier: mockStatusNotifier,
      }
    );

    expect(result.success).toBe(true);
    // Verifies atomic inventory increment
    expect(mockTx.part.update).toHaveBeenCalledWith({
      where: { id: 'part-x' },
      data: { quantity: { increment: 2 } },
    });
    expect(mockTx.part.update).toHaveBeenCalledWith({
      where: { id: 'part-y' },
      data: { quantity: { increment: 1 } },
    });
    expect(mockTx.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Cliente solicitó cancelar servicio',
          assignedToId: null,
        }),
      })
    );
  });
});
