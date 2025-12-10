import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/search - Global search endpoint
 *
 * Searches tickets and customers by query string.
 * Respects tenant isolation (except for super admin).
 *
 * @query q - Search query (min 2 characters)
 * @returns Array of search results
 */
export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const tenantFilter = isSuperAdmin ? {} : { tenantId: session.user.tenantId };

    try {
        // Search tickets
        const tickets = await prisma.ticket.findMany({
            where: {
                ...tenantFilter,
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { id: { contains: query, mode: 'insensitive' } },
                    { customer: { name: { contains: query, mode: 'insensitive' } } },
                ],
            },
            include: {
                customer: {
                    select: { name: true },
                },
            },
            take: 5,
            orderBy: { updatedAt: 'desc' },
        });

        // Search customers
        const customers = await prisma.customer.findMany({
            where: {
                ...tenantFilter,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
        });

        const statusLabels: Record<string, string> = {
            'OPEN': 'Abierto',
            'IN_PROGRESS': 'En Progreso',
            'WAITING_FOR_PARTS': 'Esperando',
            'RESOLVED': 'Resuelto',
            'CLOSED': 'Cerrado',
        };

        const results = [
            ...tickets.map((ticket: typeof tickets[number]) => ({
                type: 'ticket' as const,
                id: ticket.id,
                title: ticket.title,
                subtitle: `Cliente: ${ticket.customer.name}`,
                status: statusLabels[ticket.status] || ticket.status,
            })),
            ...customers.map((customer: typeof customers[number]) => ({
                type: 'customer' as const,
                id: customer.id,
                title: customer.name,
                subtitle: customer.email || customer.phone || 'Sin contacto',
            })),
        ];

        return NextResponse.json({ results });

    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
