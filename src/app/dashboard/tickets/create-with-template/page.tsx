import TicketWizard from './TicketWizard';

export const metadata = {
  title: 'Crear Ticket desde Plantilla',
  description: 'Crea una orden de servicio rápida usando plantillas predefinidas.',
};

export default function CreateTicketWithTemplatePage() {
  return <TicketWizard />;
}
