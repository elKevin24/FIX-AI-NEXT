import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardBody } from '@/components/ui';
import CreateCustomerForm from './CreateCustomerForm';
import PageHeader from '@/components/PageHeader';

export default async function CreateCustomerPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <PageHeader
        title="Nuevo Cliente"
        subtitle="Crea un nuevo registro de cliente"
      />
      <Card>
        <CardBody>
          <CreateCustomerForm />
        </CardBody>
      </Card>
    </div>
  );
}
