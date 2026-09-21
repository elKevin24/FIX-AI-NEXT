import SimpleTicketForm from './SimpleTicketForm';

export const metadata = {
  title: 'Crear Ticket',
  description: 'Registra una nueva orden de servicio o reparación.',
};

export default function CreateTicketPage() {
    return <SimpleTicketForm />;
}
