import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

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
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, description, customerId, priority } = body;

        // Validate required fields
        if (!title || !description || !customerId) {
            return NextResponse.json(
                { error: 'Missing required fields: title, description, customerId' },
                { status: 400 }
            );
        }

        const db = getTenantPrisma(session.user.tenantId, session.user.id);

        // CRITICAL: Validate tenant isolation - ensure customer belongs to user's tenant
        const customer = await db.customer.findFirst({
            where: {
                id: customerId,
                tenantId: session.user.tenantId,
            },
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found or does not belong to your organization' },
                { status: 404 }
            );
        }

        const ticket = await db.ticket.create({
            data: {
                title,
                description,
                customerId,
                priority: priority || 'MEDIUM',
                tenantId: session.user.tenantId,
                status: 'OPEN',
                createdById: session.user.id,
            },
            include: {
                customer: true,
            },
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to create ticket:', error);
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
