import TicketSearchClient from './TicketSearchClient';

export const metadata = {
  title: 'Consulta de Estado de Ticket',
  description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  openGraph: {
    title: 'Consulta de Estado de Ticket | FIX Workshop',
    description: 'Consulta el estado actual de tu orden de servicio o reparación en FIX Workshop.',
  },
};

export default function TicketStatusPage() {
    return <TicketSearchClient demoTickets={[]} />;
}

