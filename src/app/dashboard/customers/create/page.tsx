import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Button } from '@/components/ui';
import CreateCustomerForm from './CreateCustomerForm';
import PageHeader from '@/components/PageHeader';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Nuevo Cliente',
  description: 'Registra un cliente nuevo con sus datos de contacto y equipo.',
  openGraph: {
    title: 'Nuevo Cliente | FIX Workshop',
    description: 'Registra un cliente nuevo con sus datos de contacto y equipo.',
  },
};

export default async function CreateCustomerPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <PageHeader
        title="Nuevo Cliente"
        subtitle="Registra los datos de contacto y facturación del cliente"
        actions={
          <Button
            as={Link}
            href="/dashboard/customers"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
          >
            Volver a Clientes
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              background: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              color: 'var(--color-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserPlus size={18} aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Información del Cliente</CardTitle>
              <CardDescription>Completa el formulario para dar de alta al cliente en el sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <CreateCustomerForm />
        </CardBody>
      </Card>
    </div>
  );
}

