import { Button, Section, Text, Row, Column } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';

interface TicketCreatedEmailProps {
  customerName: string;
  ticketNumber: string;
  ticketTitle: string;
  deviceType?: string | null;
  deviceModel?: string | null;
  ticketLink: string;
}

export const TicketCreatedEmail = ({
  customerName = 'Cliente',
  ticketNumber = 'TICK-0000',
  ticketTitle = 'Reparación General',
  deviceType = 'Dispositivo',
  deviceModel = 'Modelo No Especificado',
  ticketLink = '#',
}: TicketCreatedEmailProps) => {
  return (
    <EmailLayout
      previewText={`Orden de servicio #${ticketNumber} recibida`}
      heading="¡Hemos recibido tu equipo!"
    >
      <Text style={paragraph}>
        Hola <strong>{customerName}</strong>,
      </Text>
      <Text style={paragraph}>
        Tu orden de servicio ha sido registrada exitosamente en nuestro sistema.
        A continuación encontrarás los detalles de tu ticket:
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column>
            <Text style={label}>Ticket No.</Text>
            <Text style={value}>#{ticketNumber}</Text>
          </Column>
          <Column>
            <Text style={label}>Servicio</Text>
            <Text style={value}>{ticketTitle}</Text>
          </Column>
        </Row>
        <Row style={{ marginTop: '16px' }}>
             <Column>
                <Text style={label}>Dispositivo</Text>
                <Text style={value}>{deviceType} - {deviceModel}</Text>
             </Column>
        </Row>
      </Section>

      <Text style={paragraph}>
        Nuestro equipo técnico evaluará tu dispositivo a la brevedad posible. 
        Te notificaremos cualquier actualización por esta vía.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href={ticketLink}>
          Ver Estado del Ticket
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default TicketCreatedEmail;

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const infoBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const label = {
  color: '#64748b',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  fontWeight: 'bold',
  marginBottom: '4px',
};

const value = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '500',
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
