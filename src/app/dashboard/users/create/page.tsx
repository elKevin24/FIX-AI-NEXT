import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardBody } from '@/components/ui';
import CreateUserForm from './CreateUserForm';
import PageHeader from '@/components/PageHeader';

export default async function CreateUserPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only ADMIN can create users
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard/users');
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <PageHeader
        title="Nuevo Usuario"
        subtitle="Crea una nueva cuenta de usuario para tu taller"
      />
      <Card>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
