import { Button, Section, Text, Row, Column } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';

interface LowStockEmailProps {
  partName: string;
  currentQuantity: number;
  tenantName?: string;
}

export const LowStockEmail = ({
  partName = 'Repuesto',
  currentQuantity = 0,
  tenantName = 'Mi taller',
}: LowStockEmailProps) => {
  return (
    <EmailLayout
      previewText={`Alerta de stock bajo: ${partName}`}
      heading="⚠️ Alerta de Stock Bajo"
    >
      <Text style={paragraph}>
        El repuesto <strong>{partName}</strong> ha alcanzado el nivel mínimo de inventario en{' '}
        <strong>{tenantName}</strong>.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column>
            <Text style={label}>Repuesto</Text>
            <Text style={value}>{partName}</Text>
          </Column>
          <Column>
            <Text style={label}>Stock Actual</Text>
            <Text style={value}>{currentQuantity} unidades</Text>
          </Column>
        </Row>
      </Section>

      <Text style={paragraph}>
        Te recomendamos gestionar una orden de compra para reponer el inventario.
      </Text>

      <Section style={btnContainer}>
        <Button style={button} href="/dashboard/parts">
          Ver Inventario
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default LowStockEmail;

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
