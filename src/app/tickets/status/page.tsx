import { prisma } from '@/lib/prisma';
import TicketSearchClient from './TicketSearchClient';

export const metadata = {
  title: 'Consulta de Estado de Ticket',
  description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  openGraph: {
    title: 'Consulta de Estado de Ticket | FIX Workshop',
    description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  },
};

export default async function TicketStatusPage() {
    // Fetch demo tickets for the 'electrofix' tenant (created by seed)
    // or just the latest 2 tickets if that fails.

    let demoTickets: { id: string; title: string; deviceType: string | null }[] = [];

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { slug: 'electrofix' },
            select: { id: true },
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
        }
    } catch {
        // Safe fallback for static rendering or isolated environments
        demoTickets = [];
    }

    return <TicketSearchClient demoTickets={demoTickets} />;
}
