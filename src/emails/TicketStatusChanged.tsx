import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';

interface TicketStatusChangedEmailProps {
  customerName: string;
  ticketNumber: string;
  ticketTitle: string;
  oldStatus: string;
  newStatus: string;
  ticketLink: string;
  note?: string;
}

// Helper to translate status (if simple strings passed)
// Real translation happens in controller usually, but fallback here
const translate = (status: string) => {
    const map: Record<string, string> = {
        'OPEN': 'Abierto',
        'IN_PROGRESS': 'En Progreso',
        'WAITING_FOR_PARTS': 'Esperando Repuestos',
        'RESOLVED': 'Resuelto',
        'CLOSED': 'Cerrado',
        'CANCELLED': 'Cancelado'
    };
    return map[status] || status;
};

const getStatusColor = (status: string) => {
    switch(status) {
        case 'IN_PROGRESS': return '#3B82F6'; // Blue
        case 'WAITING_FOR_PARTS': return '#F59E0B'; // Orange
        case 'RESOLVED': return '#10B981'; // Green
        case 'CLOSED': return '#6B7280'; // Gray
        case 'CANCELLED': return '#EF4444'; // Red
        default: return '#6366F1'; // Indigo
    }
};

export const TicketStatusChangedEmail = ({
  customerName = 'Cliente',
  ticketNumber = 'TICK-0000',
  ticketTitle = 'Reparación General',
  oldStatus = 'Abierto',
  newStatus = 'En Progreso',
  ticketLink = '#',
  note,
}: TicketStatusChangedEmailProps) => {
  const statusLabel = translate(newStatus);
  const statusColor = getStatusColor(newStatus);

  return (
    <EmailLayout
      previewText={`Actualización ticket #${ticketNumber}: ${statusLabel}`}
      heading="Actualización de Servicio"
    >
      <Text style={paragraph}>
        Hola <strong>{customerName}</strong>,
      </Text>
      <Text style={paragraph}>
        El estado de tu orden de servicio <strong>#{ticketNumber}</strong> ha cambiado.
      </Text>

      <Section style={{ ...statusContainer, borderColor: statusColor }}>
         <Text style={{ ...statusText, color: statusColor }}>
            {translate(oldStatus)} &rarr; {statusLabel}
         </Text>
      </Section>

      {note && (
         <Section style={noteBox}>
            <Text style={noteLabel}>Nota del técnico:</Text>
            <Text style={noteText}>&quot;{note}&quot;</Text>
         </Section>
      )}

      <Text style={paragraph}>
        Puedes aprobar presupuestos, enviar mensajes o ver más detalles en tu portal.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href={ticketLink}>
          Ver Detalles del Ticket
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default TicketStatusChangedEmail;

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const statusContainer = {
    padding: '16px',
    backgroundColor: '#fff',
    borderLeft: '4px solid #3B82F6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    borderRadius: '4px',
    margin: '24px 0',
    textAlign: 'center' as const,
};

const statusText = {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
    textTransform: 'uppercase' as const,
};

const noteBox = {
    backgroundColor: '#fffbeb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fcd34d'
};

const noteLabel = {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
};

const noteText = {
    fontSize: '15px',
    color: '#b45309',
    fontStyle: 'italic',
    margin: '0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563EB',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};
