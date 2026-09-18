import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { hasPermission, UserRole } from '@/lib/auth-utils';
import { CreateTicketSchema } from '@/lib/schemas';
import { CreateTicketUseCase } from '@/use-cases/tickets/CreateTicketUseCase';
import { toClientMessage } from '@/lib/errors';

export async function GET(request: Request) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getTenantPrisma(session.user.tenantId, session.user.id);
        const tickets = await db.ticket.findMany({
            include: {
                customer: true,
                assignedTo: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('Failed to fetch tickets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role as UserRole, 'canCreateTickets')) {
        return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { customerId, customerName, customerEmail, customerPhone, ...ticketFields } = body;

        const validationResult = CreateTicketSchema.safeParse(ticketFields);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        if (!customerId && !customerName) {
            return NextResponse.json(
                { error: 'Customer ID or Customer Name is required' },
                { status: 400 }
            );
        }

        const ticket = await CreateTicketUseCase.execute({
            ticketData: validationResult.data,
            customerInfo: {
                customerId,
                customerName,
                customerEmail,
                customerPhone,
            },
            tenantId: session.user.tenantId,
            userId: session.user.id,
        });

        return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
        console.error('Failed to create ticket:', error);
        return NextResponse.json(
            { error: toClientMessage(error, 'Internal Server Error') },
            { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 }
        );
    }
}
