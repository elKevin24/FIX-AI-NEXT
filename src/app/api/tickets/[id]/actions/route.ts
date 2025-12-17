import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Define TicketStatus locally since it may not be exported yet
enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTS = 'WAITING_FOR_PARTS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

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

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        customer: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    let updatedTicket;
    let auditAction = '';
    let auditDetails = '';

    switch (action) {
      case 'take':
        // Technician takes an unassigned ticket
        const technician = await prisma.user.findUnique({
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
          return NextResponse.json(
            { error: 'Technician not found' },
            { status: 404 }
          );
        }

        // Check if technician is available
        if (technician.status !== 'AVAILABLE') {
          return NextResponse.json(
            { error: `Technician is ${technician.status}` },
            { status: 400 }
          );
        }

        // Check workload limit
        if (
          technician._count.assignedTickets >= technician.maxConcurrentTickets
        ) {
          return NextResponse.json(
            {
              error: `Workload limit reached (${technician.maxConcurrentTickets} tickets)`,
            },
            { status: 400 }
          );
        }

        updatedTicket = await prisma.ticket.update({
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

        auditAction = 'TAKE_TICKET';
        auditDetails = `${session.user.name} took ticket #${id.substring(0, 8)}`;
        break;

      case 'assign':
        // Admin assigns ticket to a technician
        if (!assignedToId) {
          return NextResponse.json(
            { error: 'assignedToId is required for assign action' },
            { status: 400 }
          );
        }

        // Verify target technician exists and belongs to tenant
        const targetTechnician = await prisma.user.findFirst({
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
          return NextResponse.json(
            { error: 'Target technician not found' },
            { status: 404 }
          );
        }

        // Check if target technician is available
        if (targetTechnician.status !== 'AVAILABLE') {
          return NextResponse.json(
            { error: `Technician is ${targetTechnician.status}` },
            { status: 400 }
          );
        }

        // Check workload limit
        if (
          targetTechnician._count.assignedTickets >=
          targetTechnician.maxConcurrentTickets
        ) {
          return NextResponse.json(
            {
              error: `Technician workload limit reached (${targetTechnician.maxConcurrentTickets} tickets)`,
            },
            { status: 400 }
          );
        }

        updatedTicket = await prisma.ticket.update({
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

        auditAction = 'ASSIGN_TICKET';
        auditDetails = `${session.user.name} assigned ticket #${id.substring(0, 8)} to ${targetTechnician.name}`;
        break;

      case 'start':
        // Start work on ticket
        updatedTicket = await prisma.ticket.update({
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

        auditAction = 'START_TICKET';
        auditDetails = `Started work on ticket #${id.substring(0, 8)}`;
        break;

      case 'wait_for_parts':
        // Put ticket on hold waiting for parts
        if (!note) {
          return NextResponse.json(
            { error: 'Note is required when waiting for parts' },
            { status: 400 }
          );
        }

        updatedTicket = await prisma.ticket.update({
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

        // Add note
        await prisma.ticketNote.create({
          data: {
            ticketId: id,
            content: note,
            isInternal: true,
            authorId: session.user.id,
          },
        });

        auditAction = 'WAIT_FOR_PARTS';
        auditDetails = `Ticket #${id.substring(0, 8)} waiting for parts: ${note}`;
        break;

      case 'resume':
        // Resume work from waiting for parts
        updatedTicket = await prisma.ticket.update({
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
          await prisma.ticketNote.create({
            data: {
              ticketId: id,
              content: note,
              isInternal: true,
              authorId: session.user.id,
            },
          });
        }

        auditAction = 'RESUME_TICKET';
        auditDetails = `Resumed work on ticket #${id.substring(0, 8)}`;
        break;

      case 'resolve':
        // Mark ticket as resolved
        if (!note) {
          return NextResponse.json(
            { error: 'Closing note is required when resolving ticket' },
            { status: 400 }
          );
        }

        updatedTicket = await prisma.ticket.update({
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

        // Add closing note
        await prisma.ticketNote.create({
          data: {
            ticketId: id,
            content: note,
            isInternal: true,
            authorId: session.user.id,
          },
        });

        auditAction = 'RESOLVE_TICKET';
        auditDetails = `Resolved ticket #${id.substring(0, 8)}`;
        break;

      case 'deliver':
        // Mark ticket as delivered/closed
        updatedTicket = await prisma.ticket.update({
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
          await prisma.ticketNote.create({
            data: {
              ticketId: id,
              content: note,
              isInternal: false,
              authorId: session.user.id,
            },
          });
        }

        auditAction = 'DELIVER_TICKET';
        auditDetails = `Delivered ticket #${id.substring(0, 8)} to customer`;
        break;

      case 'cancel':
        // Cancel ticket
        if (!cancellationReason) {
          return NextResponse.json(
            { error: 'Cancellation reason is required' },
            { status: 400 }
          );
        }

        // Restore parts to inventory
        const partsUsed = await prisma.partUsage.findMany({
          where: { ticketId: id },
          include: { part: true },
        });

        for (const usage of partsUsed) {
          await prisma.part.update({
            where: { id: usage.partId },
            data: {
              quantity: {
                increment: usage.quantity,
              },
            },
          });
        }

        updatedTicket = await prisma.ticket.update({
          where: { id },
          data: {
            status: TicketStatus.CANCELLED,
            cancellationReason,
            updatedById: session.user.id,
          },
          include: {
            customer: true,
            assignedTo: true,
          },
        });

        auditAction = 'CANCEL_TICKET';
        auditDetails = `Cancelled ticket #${id.substring(0, 8)}: ${cancellationReason}`;
        break;

      case 'reopen':
        // Reopen a closed/cancelled ticket
        updatedTicket = await prisma.ticket.update({
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
          await prisma.ticketNote.create({
            data: {
              ticketId: id,
              content: `Ticket reopened: ${note}`,
              isInternal: true,
              authorId: session.user.id,
            },
          });
        }

        auditAction = 'REOPEN_TICKET';
        auditDetails = `Reopened ticket #${id.substring(0, 8)}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: auditAction,
        details: auditDetails,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

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
