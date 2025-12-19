import { NextResponse } from 'next/server';
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

        // Technically already secured by getTenantPrisma + tenantId in where(if used) or implicit tenantId check if we rely on it.
        // But since getTenantPrisma(tenantId) creates a client that might not ALWAYS inject tenantId into every findUnique (unless using specific extensions setup),
        // we should double check if the extension guarantees it. 
        // Based on actions.ts patterns, we either trust the client or check manually.
        // However, standard prisma client findUnique usually searches globally if valid ID.
        // BUT `getTenantPrisma` returns a client extended with $extends...
        // Let's assume the extension handles it OR we add a check.  
        // Wait, for `findUnique` if the ID is global UUID, it finds it.
        // Does the extension add `where: { tenantId }` automatically?
        // If not, we should use `findFirst` with tenantId OR check result.tenantId.
        // Let's use `findFirst` to be safe and consistent with previous code OR check after.
        // Actually, `getTenantPrisma` logic in `tenant-prisma.ts` usually adds RLS-like behavior or we manually check.
        // For safety/compatibility with what I did in actions.ts (where I used tenantDb.model.findUnique and sometimes checked tenantId manually),
        // I'll manually check tenantId if the query doesn't restrict it, OR use findFirst({ where: { id, tenantId } }).
        // BUT `getTenantPrisma` MIGHT restrict it.
        // Let's stick to the previous code's `findFirst` pattern with `db`.

        if (ticket.tenantId !== session.user.tenantId) {
             return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to fetch ticket:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }
}

/**
 * Update a ticket's status, assignment, or priority
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, assignedToId, priority } = body;

        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        // Verify ticket belongs to user's tenant
        const existingTicket = await db.ticket.findUnique({
            where: { id: id },
        });

        if (!existingTicket || existingTicket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const ticket = await db.ticket.update({
            where: { id: id },
            data: {
                status,
                assignedToId,
                priority,
            },
            include: {
                customer: true,
                assignedTo: true,
            },
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to update ticket:', error);
        return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
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
            where: { id: id },
        });

        if (!existingTicket || existingTicket.tenantId !== session.user.tenantId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        await db.ticket.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete ticket:', error);
        return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }
}
