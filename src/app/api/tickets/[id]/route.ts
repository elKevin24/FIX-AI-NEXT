import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

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
            where: { id },
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

        if (!ticket || ticket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Update a ticket's status, assignment, or priority (ADMIN, MANAGER, TECHNICIAN)
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only authorized roles can update tickets via API
    const userRole = session.user.role;
    if (userRole === 'VIEWER') {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, assignedToId, priority } = body;

        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify ticket belongs to user's tenant
        const existingTicket = await db.ticket.findUnique({
            where: { id },
        });

        if (!existingTicket || existingTicket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const ticket = await db.ticket.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(assignedToId !== undefined && { assignedToId }),
                ...(priority && { priority }),
            },
            include: {
                customer: true,
                assignedTo: true,
            },
        });

        revalidatePath('/dashboard/tickets');
        revalidatePath(`/dashboard/tickets/${id}`);
        revalidatePath('/dashboard');

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to update ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Delete a ticket (ADMIN only)
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify ticket belongs to user's tenant
        const existingTicket = await db.ticket.findUnique({
            where: { id },
        });

        if (!existingTicket || existingTicket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        await db.ticket.delete({
            where: { id },
        });

        revalidatePath('/dashboard/tickets');
        revalidatePath('/dashboard');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
