import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { hasPermission, type UserRole } from '@/lib/auth-utils';
import { UpdateTicketSchema, DeleteTicketSchema } from '@/lib/schemas';
import { UpdateTicketStatusUseCase } from '@/use-cases/tickets/UpdateTicketStatusUseCase';
import { UpdateTicketUseCase } from '@/use-cases/tickets/UpdateTicketUseCase';
import { DeleteTicketUseCase } from '@/use-cases/tickets/DeleteTicketUseCase';
import { NotFoundError, ValidationError } from '@/lib/errors';

/**
 * Get a single ticket by ID with tenant isolation
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        const ticket = await db.ticket.findUnique({
            where: {
                id: id,
            },
            include: {
                customer: true,
                assignedTo: true,
                partsUsed: {
                    include: {
                        part: true,
                    },
                },
            },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (ticket.tenantId !== session.user.tenantId) {
             return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Update a ticket's status, assignment, or priority.
 * Delegates to domain use-cases so state transitions, audit, and notifications
 * are not bypassed.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user.role as UserRole, 'canEditTickets')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validated = UpdateTicketSchema.safeParse({
        ticketId: id,
        status: body['status'],
        assignedToId: body['assignedToId'],
        priority: body['priority'],
    });

    if (!validated.success) {
        return NextResponse.json({ errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const { status, assignedToId, priority } = validated.data;

    if (!status && assignedToId === undefined && priority === undefined) {
        return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    try {
        if (status) {
            await UpdateTicketStatusUseCase.execute({
                ticketId: id,
                status,
                note: typeof body['note'] === 'string' ? body['note'] : undefined,
                tenantId: session.user.tenantId,
                userId: session.user.id,
            });
        }

        if (assignedToId !== undefined || priority !== undefined) {
            await UpdateTicketUseCase.execute({
                validatedData: { ticketId: id, status: undefined, assignedToId, priority },
                tenantId: session.user.tenantId,
                userId: session.user.id,
                userName: session.user.name ?? 'Admin',
            });
        }

        const db = getTenantPrisma(session.user.tenantId, session.user.id);
        const ticket = await db.ticket.findUnique({
            where: { id },
            include: { customer: true, assignedTo: true },
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error('Failed to update ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Delete a ticket (soft delete via domain use case).
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user.role as UserRole, 'canDeleteTickets')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    let reason: unknown;
    try {
        ({ reason } = await request.json());
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validated = DeleteTicketSchema.safeParse({ ticketId: id, reason });

    if (!validated.success) {
        return NextResponse.json({ errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    try {
        await DeleteTicketUseCase.execute({
            ticketId: validated.data.ticketId,
            reason: validated.data.reason,
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error('Failed to delete ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
