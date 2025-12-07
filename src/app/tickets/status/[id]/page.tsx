import { getTicketById } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';
import { Metadata } from 'next';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    
    const ticket = await getTicketById(id);
    return {
        title: `Ticket ${id.substring(0, 8)} - ${ticket.title}`,
        description: `Estado del ticket: ${ticket.status} - ${ticket.title}`,
    };
}

export default async function TicketStatusPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    
    const ticket = await getTicketById(id);
    return <TicketStatusCard ticket={ticket} />;
}
