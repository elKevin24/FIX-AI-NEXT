import { getTenantPrisma } from '@/lib/tenant-prisma';
import { TicketStatus, UserRole } from '@prisma/client';
import {
  requireTicketActionPermission,
  TicketAction,
  AuthorizationError,
} from '@/lib/auth-utils';
import {
  isValidTransition,
  TicketStatus as SMStatus,
} from '@/lib/ticket-state-machine';
import {
  notifyTicketStatusChange,
  notifyTechnicianAssigned,
  TicketNotificationData,
} from '@/lib/ticket-notifications';
import { NotFoundError, ValidationError } from '@/lib/errors';

export interface ExecuteTicketActionParams {
  readonly ticketId: string;
  readonly action: TicketAction;
  readonly tenantId: string;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly userName?: string | null;
  readonly assignedToId?: string;
  readonly note?: string;
  readonly cancellationReason?: string;
}

export interface ExecuteTicketActionResult {
  readonly success: boolean;
  readonly message: string;
  readonly ticket: any;
}

export interface ExecuteTicketActionDependencies {
  readonly db?: any;
  readonly statusNotifier?: typeof notifyTicketStatusChange;
  readonly techNotifier?: typeof notifyTechnicianAssigned;
}

interface ActionContext {
  readonly ticket: any;
  readonly params: ExecuteTicketActionParams;
}

type ActionStrategy = (tx: any, ctx: ActionContext) => Promise<any>;

/**
 * Validates technician availability and workload limits atomically within a transaction.
 */
async function verifyTechnicianCapacity(
  tx: any,
  technicianId: string,
  tenantId: string
): Promise<void> {
  const findTechnician = tx.user?.findUnique
    ? tx.user.findUnique.bind(tx.user)
    : tx.user.findFirst.bind(tx.user);

  const technician = await findTechnician({
    where: {
      id: technicianId,
      ...(tx.user?.findUnique ? {} : { tenantId }),
    },
    include: {
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: {
                in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS'],
              },
            },
          },
        },
      },
    },
  });

  if (!technician) {
    throw new ValidationError('Technician not found', 'assignedToId');
  }

  if (technician.status !== 'AVAILABLE') {
    throw new ValidationError(
      `Technician is ${technician.status}`,
      'technician'
    );
  }

  if (technician._count.assignedTickets >= technician.maxConcurrentTickets) {
    throw new ValidationError(
      `Workload limit reached (${technician.maxConcurrentTickets} tickets)`,
      'workload'
    );
  }
}

/**
 * Helper to update ticket and optionally create a ticket note within the transaction.
 */
async function transitionTicket(
  tx: any,
  ticketId: string,
  status: TicketStatus,
  userId: string,
  note?: string,
  isInternal: boolean = true,
  extraData: Record<string, any> = {}
) {
  const updated = await tx.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      updatedById: userId,
      ...extraData,
    },
    include: {
      customer: true,
      assignedTo: true,
    },
  });

  if (note && note.trim().length > 0) {
    await tx.ticketNote.create({
      data: {
        ticketId,
        content: note.trim(),
        isInternal,
        authorId: userId,
      },
    });
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Strategy implementations for each action (Strategy Pattern)
// ---------------------------------------------------------------------------

const ACTION_STRATEGIES: Record<TicketAction, ActionStrategy> = {
  take: async (tx, { ticket, params }) => {
    // Verify ticket is not already assigned
    const current = await tx.ticket.findUnique({
      where: { id: ticket.id },
      select: { assignedToId: true },
    });

    if (current?.assignedToId) {
      throw new ValidationError(
        'Ticket is already assigned to another technician',
        'assignedToId'
      );
    }

    await verifyTechnicianCapacity(tx, params.userId, params.tenantId);

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.IN_PROGRESS,
      params.userId,
      params.note,
      true,
      { assignedToId: params.userId }
    );
  },

  assign: async (tx, { ticket, params }) => {
    if (!params.assignedToId) {
      throw new ValidationError(
        'assignedToId es requerido para la acción assign',
        'assignedToId'
      );
    }

    await verifyTechnicianCapacity(tx, params.assignedToId, params.tenantId);

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.IN_PROGRESS,
      params.userId,
      params.note,
      true,
      { assignedToId: params.assignedToId }
    );
  },

  start: async (tx, { ticket, params }) => {
    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.IN_PROGRESS,
      params.userId,
      params.note
    );
  },

  wait_for_parts: async (tx, { ticket, params }) => {
    if (!params.note || params.note.trim().length === 0) {
      throw new ValidationError(
        'Nota requerida al poner ticket en espera de repuestos',
        'note'
      );
    }

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.WAITING_FOR_PARTS,
      params.userId,
      params.note,
      true
    );
  },

  resume: async (tx, { ticket, params }) => {
    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.IN_PROGRESS,
      params.userId,
      params.note
    );
  },

  resolve: async (tx, { ticket, params }) => {
    if (!params.note || params.note.trim().length === 0) {
      throw new ValidationError(
        'Nota de cierre requerida al resolver el ticket',
        'note'
      );
    }

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.RESOLVED,
      params.userId,
      params.note,
      true
    );
  },

  deliver: async (tx, { ticket, params }) => {
    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.CLOSED,
      params.userId,
      params.note,
      false
    );
  },

  cancel: async (tx, { ticket, params }) => {
    if (!params.cancellationReason || params.cancellationReason.trim().length < 5) {
      throw new ValidationError(
        'El motivo de cancelación debe tener al menos 5 caracteres',
        'cancellationReason'
      );
    }

    // Atomic restoration of parts back to inventory
    const partsUsed = await tx.partUsage.findMany({
      where: { ticketId: ticket.id },
      select: { partId: true, quantity: true },
    });

    for (const usage of partsUsed) {
      await tx.part.update({
        where: { id: usage.partId },
        data: {
          quantity: { increment: usage.quantity },
        },
      });
    }

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.CANCELLED,
      params.userId,
      params.note,
      true,
      {
        cancellationReason: params.cancellationReason.trim(),
        assignedToId: null,
      }
    );
  },

  reopen: async (tx, { ticket, params }) => {
    const noteContent = params.note
      ? `Ticket reabierto: ${params.note.trim()}`
      : 'Ticket reabierto';

    return transitionTicket(
      tx,
      ticket.id,
      TicketStatus.IN_PROGRESS,
      params.userId,
      noteContent,
      true,
      { cancellationReason: null }
    );
  },
};

/**
 * ExecuteTicketActionUseCase
 * 
 * Orchestrates ticket workflow transitions using:
 * - RBAC permission validation
 * - State machine validation (isValidTransition)
 * - Atomic transactional action execution (Strategy Pattern)
 * - Cohesive notification dispatching
 */
export class ExecuteTicketActionUseCase {
  static async execute(
    params: ExecuteTicketActionParams,
    deps?: ExecuteTicketActionDependencies
  ): Promise<ExecuteTicketActionResult> {
    const { ticketId, action, tenantId, userId, userRole } = params;

    // 1. RBAC authorization
    requireTicketActionPermission(userRole, action);

    const db = deps?.db ?? getTenantPrisma(tenantId, userId);
    const notifyStatus = deps?.statusNotifier ?? notifyTicketStatusChange;
    const notifyTech = deps?.techNotifier ?? notifyTechnicianAssigned;

    // 2. Locate ticket
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedTo: true,
      },
    });

    if (!ticket || ticket.tenantId !== tenantId) {
      throw new NotFoundError('Ticket', ticketId);
    }

    // 3. State Machine transition validation
    const currentStatus = (ticket.status as unknown as SMStatus) || SMStatus.OPEN;
    if (!isValidTransition(currentStatus, action)) {
      throw new ValidationError(
        `Transición no permitida: No se puede ejecutar la acción '${action}' en un ticket con estado '${ticket.status || 'OPEN'}'`,
        'status'
      );
    }

    // 4. Resolve and execute action strategy inside an atomic transaction
    const strategy = ACTION_STRATEGIES[action];
    if (!strategy) {
      throw new ValidationError(`Acción no reconocida: ${action}`, 'action');
    }

    const updatedTicket = await db.$transaction(async (tx: any) => {
      return await strategy(tx, { ticket, params });
    });

    // 5. Unified notification dispatch
    if (updatedTicket) {
      try {
        const ticketNotificationData: TicketNotificationData = {
          id: updatedTicket.id,
          ticketNumber: updatedTicket.ticketNumber,
          title: updatedTicket.title,
          deviceType: updatedTicket.deviceType,
          deviceModel: updatedTicket.deviceModel,
          status: updatedTicket.status,
          customerId: updatedTicket.customerId,
          customer: {
            id: updatedTicket.customer?.id,
            name: updatedTicket.customer?.name || 'Cliente',
            email: updatedTicket.customer?.email,
          },
          assignedToId: updatedTicket.assignedToId,
          assignedTo: updatedTicket.assignedTo,
          tenantId: updatedTicket.tenantId,
        };

        await notifyStatus(ticketNotificationData, {
          oldStatus: ticket.status,
          newStatus: updatedTicket.status,
          note: params.note || params.cancellationReason,
        });

        if (
          (action === 'assign' || action === 'take') &&
          updatedTicket.assignedToId &&
          updatedTicket.assignedTo
        ) {
          await notifyTech(
            ticketNotificationData,
            params.userName || 'Un administrador'
          );
        }
      } catch (err) {
        console.error('Failed to send notifications for ticket action:', err);
      }
    }

    return {
      success: true,
      message: `Ticket ${action} exitosamente`,
      ticket: updatedTicket,
    };
  }
}
