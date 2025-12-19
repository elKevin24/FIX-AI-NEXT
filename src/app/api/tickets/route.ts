import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                tenantId: session.user.tenantId,
            },
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

        // CRITICAL: Validate tenant isolation - ensure customer belongs to user's tenant
        const customer = await prisma.customer.findFirst({
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

        const ticket = await prisma.ticket.create({
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

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE_TICKET',
                details: JSON.stringify({ ticketId: ticket.id, title }),
                userId: session.user.id,
                tenantId: session.user.tenantId,
            },
        });

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('Failed to create ticket:', error);
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
}
