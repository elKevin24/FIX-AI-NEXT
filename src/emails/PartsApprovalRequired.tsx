import { Button, Section, Text, Row, Column } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';

interface PartsApprovalRequiredEmailProps {
  customerName: string;
  ticketNumber: string;
  ticketTitle: string;
  partName: string;
  partSku?: string;
  quantity: number;
  priceAtProposal: number;
  total: number;
  ticketLink?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);

export const PartsApprovalRequiredEmail = ({
  customerName = 'Cliente',
  ticketNumber = '',
  ticketTitle = '',
  partName = 'Repuesto',
  partSku = '',
  quantity = 1,
  priceAtProposal = 0,
  total = 0,
  ticketLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fix-ai-next.vercel.app'}/dashboard/tickets`,
}: PartsApprovalRequiredEmailProps) => {
  return (
    <EmailLayout
      previewText={`Necesitamos tu aprobación para continuar con el ticket #${ticketNumber}`}
      heading="Aprobación de Repuestos Requerida"
    >
      <Text style={paragraph}>
        Hola <strong>{customerName}</strong>,
      </Text>

      <Text style={paragraph}>
        Para continuar con la reparación del ticket <strong>#{ticketNumber}</strong>{' '}
        ({ticketTitle}), necesitamos tu autorización para usar el siguiente repuesto:
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={colLeft}>
            <Text style={label}>Repuesto</Text>
            <Text style={value}>{partName}</Text>
            {partSku ? <Text style={muted}>{partSku}</Text> : null}
          </Column>
          <Column style={colRight}>
            <Text style={label}>Cantidad</Text>
            <Text style={value}>{quantity} uds</Text>
          </Column>
        </Row>
        <Row>
          <Column style={colLeft}>
            <Text style={label}>Precio propuesto</Text>
            <Text style={value}>{formatCurrency(priceAtProposal)}</Text>
          </Column>
          <Column style={colRight}>
            <Text style={label}>Total</Text>
            <Text style={value}>{formatCurrency(total)}</Text>
          </Column>
        </Row>
      </Section>

      <Text style={paragraph}>
        Este repuesto <strong>no ha sido cobrado ni descontado del inventario</strong>{' '}
        hasta que confirmes la aprobación. Puedes comunicarte con el taller para
        aprobar o rechazar esta propuesta.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href={ticketLink}>
          Ver Ticket
        </Button>
      </Section>

      <Text style={muted}>
        Si no reconoces esta solicitud, ignora este mensaje o contacta al taller.
      </Text>
    </EmailLayout>
  );
};

export default PartsApprovalRequiredEmail;

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const infoBox = {
  backgroundColor: '#f4f7fb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
};

const label = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
};

const value = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#111827',
  fontWeight: 600,
  margin: '0',
};

const muted = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#9ca3af',
  margin: '4px 0 0',
};

const colLeft = {
  textAlign: 'left' as const,
  width: '50%',
  paddingBottom: '12px',
};

const colRight = {
  textAlign: 'right' as const,
  width: '50%',
  paddingBottom: '12px',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2563EB',
  color: '#ffffff',
  borderRadius: '6px',
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
};
