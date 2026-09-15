import { prisma } from '@/lib/prisma';
import TicketSearchClient from './TicketSearchClient';

export default async function TicketStatusPage() {
    // Fetch demo tickets for the 'electrofix' tenant (created by seed)
    // or just the latest 2 tickets if that fails.

    let demoTickets: { id: string; title: string; deviceType: string | null }[] = [];

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'electrofix' }
        });

        if (tenant) {
            demoTickets = await prisma.ticket.findMany({
                where: { tenantId: tenant.id },
                take: 2,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    deviceType: true
                }
            });
        } else {
            // Fallback if seeded tenant not found (e.g. random data)
            demoTickets = await prisma.ticket.findMany({
                take: 2,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    deviceType: true
                }
            });
        }
    } catch (error) {
        console.error("Failed to fetch demo tickets:", error);
        // Continue with empty demos
    }

    return <TicketSearchClient demoTickets={demoTickets} />;
}
