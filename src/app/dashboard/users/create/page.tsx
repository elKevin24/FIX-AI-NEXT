import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui';
import CreateUserForm from './CreateUserForm';

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
    <div style={{ padding: 'var(--spacing-6)', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
            Create a new user account for your workshop
          </p>
        </CardHeader>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
