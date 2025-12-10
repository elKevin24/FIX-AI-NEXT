import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui';
import CreateCustomerForm from './CreateCustomerForm';

export default async function CreateCustomerPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  return (
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
            Create a new customer record
          </p>
        </CardHeader>
        <CardBody>
          <CreateCustomerForm />
        </CardBody>
      </Card>
    </div>
  );
}
