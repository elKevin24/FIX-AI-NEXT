import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardBody } from '@/components/ui';
import CreateUserForm from './CreateUserForm';
import PageHeader from '@/components/PageHeader';
import { hasPermission } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

export const metadata = {
  title: 'Nuevo Usuario',
  description: 'Crea una cuenta de técnico, recepcionista o administrador del taller.',
};

export default async function CreateUserPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Check permissions to create users
  if (!hasPermission(session.user.role as UserRole, 'canCreateUsers')) {
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
