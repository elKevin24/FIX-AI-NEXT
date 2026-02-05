import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { TicketStatus, UserRole } from '@/generated/prisma';
import {
  requireTicketActionPermission,
  TicketAction,
  AuthorizationError,
} from '@/lib/auth-utils';
import {
  notifyTicketStatusChange,
  notifyTechnicianAssigned,
} from '@/lib/ticket-notifications';

/**
 * @swagger
 * /api/tickets/{id}/actions:
 *   post:
 *     summary: Perform actions on a ticket (assign, take, start, etc.)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [take, assign, start, wait_for_parts, resume, resolve, deliver, cancel, reopen]
 *               assignedToId:
 *                 type: string
 *                 description: Required for 'assign' action
 *               note:
 *                 type: string
 *                 description: Optional note for the action
 *               cancellationReason:
 *                 type: string
 *                 description: Required for 'cancel' action
 *     responses:
 *       200:
 *         description: Action performed successfully
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, assignedToId, note, cancellationReason } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // ========================================================================
    // RBAC: Validate user has permission to perform this action
    // ========================================================================
    try {
      requireTicketActionPermission(session.user.role as UserRole, action as TicketAction);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);

    // Verify ticket exists and belongs to tenant
    const ticket = await db.ticket.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        assignedTo: true,
      },
    });

    if (!ticket || ticket.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    let updatedTicket;

    switch (action) {
      case 'take':
        // Technician takes an unassigned ticket
        // TRANSACTION: Prevents race condition in workload checking
        try {
          updatedTicket = await db.$transaction(async (tx: any) => {
            // Re-fetch technician with current workload INSIDE transaction
            const technician = await tx.user.findUnique({
              where: { id: session.user.id },
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
              throw new Error('Technician not found');
            }

            // Check if technician is available
            if (technician.status !== 'AVAILABLE') {
              throw new Error(`Technician is ${technician.status}`);
            }

            // Check workload limit (inside transaction for consistency)
            if (
              technician._count.assignedTickets >= technician.maxConcurrentTickets
            ) {
              throw new Error(
                `Workload limit reached (${technician.maxConcurrentTickets} tickets)`
              );
            }

            // Verify ticket is not already assigned
            const currentTicket = await tx.ticket.findUnique({
              where: { id },
              select: { assignedToId: true, status: true },
            });

            if (currentTicket?.assignedToId) {
              throw new Error('Ticket is already assigned to another technician');
            }

            // Update ticket assignment
            const updated = await tx.ticket.update({
              where: { id },
              data: {
                assignedToId: session.user.id,
                status: TicketStatus.IN_PROGRESS,
                updatedById: session.user.id,
              },
              include: {
                customer: true,
                assignedTo: true,
              },
            });

            return updated;
          });
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message || 'Failed to take ticket' },
            { status: 400 }
          );
        }
        break;

      case 'assign':
        // Admin assigns ticket to a technician
        if (!assignedToId) {
          return NextResponse.json(
            { error: 'assignedToId is required for assign action' },
            { status: 400 }
          );
        }

        // TRANSACTION: Prevents race condition in workload checking
        try {
          updatedTicket = await db.$transaction(async (tx: any) => {
            // Verify target technician exists and belongs to tenant (inside transaction)
            const targetTechnician = await tx.user.findFirst({
              where: {
                id: assignedToId,
                tenantId: session.user.tenantId,
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

            if (!targetTechnician) {
              throw new Error('Target technician not found');
            }

            // Check if target technician is available
            if (targetTechnician.status !== 'AVAILABLE') {
              throw new Error(`Technician is ${targetTechnician.status}`);
            }

            // Check workload limit (inside transaction for consistency)
            if (
              targetTechnician._count.assignedTickets >=
              targetTechnician.maxConcurrentTickets
            ) {
              throw new Error(
                `Technician workload limit reached (${targetTechnician.maxConcurrentTickets} tickets)`
              );
            }

            // Update ticket assignment
            const updated = await tx.ticket.update({
              where: { id },
              data: {
                assignedToId,
                status: TicketStatus.IN_PROGRESS,
                updatedById: session.user.id,
              },
              include: {
                customer: true,
                assignedTo: true,
              },
            });

            return updated;
          });
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message || 'Failed to assign ticket' },
            { status: 400 }
          );
        }
        break;

      case 'start':
        // Start work on ticket
        updatedTicket = await db.ticket.update({
          where: { id },
          data: {
            status: TicketStatus.IN_PROGRESS,
            updatedById: session.user.id,
          },
          include: {
            customer: true,
            assignedTo: true,
          },
        });
        break;

      case 'wait_for_parts':
        // Put ticket on hold waiting for parts
        if (!note) {
          return NextResponse.json(
            { error: 'Note is required when waiting for parts' },
            { status: 400 }
          );
        }

        // Use transaction to update ticket and add note atomically
        updatedTicket = await db.$transaction(async (tx: any) => {
             const t = await tx.ticket.update({
                where: { id },
                data: {
                    status: TicketStatus.WAITING_FOR_PARTS,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                },
             });

             await tx.ticketNote.create({
                data: {
                    ticketId: id,
                    content: note,
                    isInternal: true,
                    authorId: session.user.id,
                }
             });

             return t;
        });
        break;

      case 'resume':
        // Resume work from waiting for parts
        updatedTicket = await db.$transaction(async (tx: any) => {
            const t = await tx.ticket.update({
                where: { id },
                data: {
                    status: TicketStatus.IN_PROGRESS,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                },
            });

            if (note) {
                await tx.ticketNote.create({
                    data: {
                    ticketId: id,
                    content: note,
                    isInternal: true,
                    authorId: session.user.id,
                    },
                });
            }
            return t;
        });
        break;

      case 'resolve':
        // Mark ticket as resolved
        if (!note) {
          return NextResponse.json(
            { error: 'Closing note is required when resolving ticket' },
            { status: 400 }
          );
        }

        updatedTicket = await db.$transaction(async (tx: any) => {
            const t = await tx.ticket.update({
                where: { id },
                data: {
                    status: TicketStatus.RESOLVED,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                },
            });

            await tx.ticketNote.create({
                data: {
                    ticketId: id,
                    content: note,
                    isInternal: true,
                    authorId: session.user.id,
                },
            });
            return t;
        });
        break;

      case 'deliver':
        // Mark ticket as delivered/closed
        updatedTicket = await db.$transaction(async (tx: any) => {
            const t = await tx.ticket.update({
                where: { id },
                data: {
                    status: TicketStatus.CLOSED,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                },
            });

            if (note) {
                await tx.ticketNote.create({
                    data: {
                    ticketId: id,
                    content: note,
                    isInternal: false,
                    authorId: session.user.id,
                    },
                });
            }
            return t;
        });
        break;

      case 'cancel':
        // Cancel ticket (RBAC validated above)
        if (!cancellationReason) {
          return NextResponse.json(
            { error: 'Cancellation reason is required' },
            { status: 400 }
          );
        }

        // Validate current status - cannot cancel already cancelled or closed tickets
        if (ticket.status === TicketStatus.CANCELLED) {
          return NextResponse.json(
            { error: 'Ticket is already cancelled' },
            { status: 400 }
          );
        }

        // ATOMIC TRANSACTION: Restore parts and update ticket status together
        updatedTicket = await db.$transaction(async (tx: any) => {
          // Get all parts used in this ticket
          const partsUsed = await tx.partUsage.findMany({
            where: { ticketId: id },
            select: { partId: true, quantity: true },
          });

          // Restore parts to inventory atomically
          for (const usage of partsUsed) {
            await tx.part.update({
              where: { id: usage.partId },
              data: {
                quantity: { increment: usage.quantity },
              },
            });
          }

          // Update ticket status
          const updated = await tx.ticket.update({
            where: { id },
            data: {
              status: TicketStatus.CANCELLED,
              cancellationReason,
              assignedToId: null, // Free up technician slot
              updatedById: session.user.id,
            },
            include: {
              customer: true,
              assignedTo: true,
            },
          });

          return updated;
        });
        break;

      case 'reopen':
        // Reopen a closed/cancelled ticket
        updatedTicket = await db.$transaction(async (tx: any) => {
             const t = await tx.ticket.update({
                where: { id },
                data: {
                    status: TicketStatus.IN_PROGRESS,
                    cancellationReason: null,
                    updatedById: session.user.id,
                },
                include: {
                    customer: true,
                    assignedTo: true,
                },
             });

             if (note) {
                await tx.ticketNote.create({
                    data: {
                    ticketId: id,
                    content: `Ticket reopened: ${note}`,
                    isInternal: true,
                    authorId: session.user.id,
                    },
                });
            }
            return t;
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Automatic audit logging handles the logs now as part of the transaction or direct calls on 'db'

    // ========================================================================
    // NOTIFICATIONS: Send notifications to customer and technician
    // ========================================================================
    if (updatedTicket) {
      try {
        const ticketNotificationData = {
            id: updatedTicket.id,
            ticketNumber: updatedTicket.ticketNumber,
            title: updatedTicket.title,
            deviceType: updatedTicket.deviceType,
            deviceModel: updatedTicket.deviceModel,
            status: updatedTicket.status,
            customerId: updatedTicket.customerId,
            customer: {
              id: updatedTicket.customer.id,
              name: updatedTicket.customer.name,
              email: updatedTicket.customer.email,
            },
            assignedToId: updatedTicket.assignedToId,
            assignedTo: updatedTicket.assignedTo,
            tenantId: updatedTicket.tenantId,
        };

        // Notify customer about status change
        await notifyTicketStatusChange(
          ticketNotificationData,
          {
            oldStatus: ticket.status,
            newStatus: updatedTicket.status,
            note,
          }
        );

        // If ticket was assigned, notify the technician
        if (
          (action === 'assign' || action === 'take') &&
          updatedTicket.assignedToId &&
          updatedTicket.assignedTo
        ) {
          await notifyTechnicianAssigned(
            ticketNotificationData,
            session.user.name || 'Un administrador'
          );
        }
      } catch (notificationError) {
        // Log notification errors but don't fail the request
        console.error('Failed to send notifications:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket ${action} successfully`,
    });
  } catch (error) {
    console.error('Error performing ticket action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
