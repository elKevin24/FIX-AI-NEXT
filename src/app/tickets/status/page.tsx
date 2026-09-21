import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { searchTicket } from '@/lib/actions';
import TicketSearchClient from './TicketSearchClient';

export const metadata = {
  title: 'Consulta de Estado de Ticket',
  description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  openGraph: {
    title: 'Consulta de Estado de Ticket | FIX Workshop',
    description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  },
};

export default async function TicketStatusPage({
    searchParams,
}: {
    searchParams?: Promise<{ query?: string; id?: string }>;
}) {
    const resolvedParams = searchParams ? await searchParams : undefined;
    const query = resolvedParams?.query || resolvedParams?.id || '';

    let initialTicket: any = null;
    let demoTickets: { id: string; title: string; deviceType: string | null }[] = [];

    if (query.trim()) {
        try {
            initialTicket = await searchTicket(query.trim());
        } catch {
            initialTicket = null;
        }
    }

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
    } catch (error) {
        // Safe fallback for static rendering or isolated environments
        console.warn('[TicketStatusPage] Notice: Could not load demo tickets during render:', error);
        demoTickets = [];
    }

    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }} />}>
            <TicketSearchClient 
                demoTickets={demoTickets} 
                initialTicket={initialTicket}
                initialQuery={query}
            />
        </Suspense>
    );
}
