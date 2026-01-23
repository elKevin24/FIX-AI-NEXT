import { Button, Section, Text, Row, Column } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';

interface TechnicianAssignedEmailProps {
  technicianName: string;
  ticketNumber: string;
  ticketTitle: string;
  assignedBy: string;
  ticketLink: string;
}

export const TechnicianAssignedEmail = ({
  technicianName = 'Técnico',
  ticketNumber = 'TICK-0000',
  ticketTitle = 'Servicio',
  assignedBy = 'Admin',
  ticketLink = '#',
}: TechnicianAssignedEmailProps) => {
  return (
    <EmailLayout
      previewText={`Nuevo ticket asignado: #${ticketNumber}`}
      heading="Tienes un nuevo ticket asignado"
    >
      <Text style={paragraph}>
        Hola <strong>{technicianName}</strong>,
      </Text>
      <Text style={paragraph}>
        <strong>{assignedBy}</strong> te ha asignado una nueva orden de servicio.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column>
            <Text style={label}>Ticket No.</Text>
            <Text style={value}>#{ticketNumber}</Text>
          </Column>
        </Row>
        <Row style={{ marginTop: '16px' }}>
             <Column>
                <Text style={label}>Problema</Text>
                <Text style={value}>{ticketTitle}</Text>
             </Column>
        </Row>
      </Section>

      <Section style={btnContainer}>
        <Button style={button} href={ticketLink}>
          Gestionar Ticket
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default TechnicianAssignedEmail;

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
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
  backgroundColor: '#0F172A', // Darker for internal
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};
