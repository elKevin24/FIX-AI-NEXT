import { getTicketById } from '@/lib/actions';
import TicketStatusCard from '@/components/tickets/TicketStatusCard';

export default async function TicketStatusPage({
    params,
}: {
    params: { id: string };
}) {
    const ticket = await getTicketById(params.id);

    return <TicketStatusCard ticket={ticket} />;
}
