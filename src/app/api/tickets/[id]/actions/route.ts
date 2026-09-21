import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { UserRole } from '@prisma/client';
import { TicketAction, AuthorizationError } from '@/lib/auth-utils';
import { ExecuteTicketActionUseCase } from '@/use-cases/tickets/ExecuteTicketActionUseCase';
import { NotFoundError, ValidationError } from '@/lib/errors';

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

    const result = await ExecuteTicketActionUseCase.execute({
      ticketId: id,
      action: action as TicketAction,
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userRole: session.user.role as UserRole,
      userName: session.user.name,
      assignedToId,
      note,
      cancellationReason,
    });

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      message: `Ticket ${action} successfully`,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error performing ticket action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 400 }
    );
  }
}
