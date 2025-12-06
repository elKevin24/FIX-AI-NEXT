import { getTicketById } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    
    try {
        const ticket = await getTicketById(id);
        return {
            title: `Ticket ${id.substring(0, 8)} - ${ticket.title}`,
            description: `Estado del ticket: ${ticket.status} - ${ticket.title}`,
        };
    } catch {
        return {
            title: `Ticket ${id.substring(0, 8)} - No encontrado`,
            description: 'El ticket solicitado no fue encontrado',
        };
    }
}

export default async function TicketStatusPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    
    try {
        const ticket = await getTicketById(id);
        return <TicketStatusCard ticket={ticket} />;
    } catch (error) {
        notFound();
    }
}
