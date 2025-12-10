import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
  }

  // Only ADMIN can view the user list
  if (session.user.role !== 'ADMIN') {
      redirect('/dashboard');
  }

  const db = getTenantPrisma(session.user.tenantId);

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const isAdmin = session.user.role === 'ADMIN';

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error' as const;
      case 'TECHNICIAN':
        return 'primary' as const;
      case 'RECEPTIONIST':
        return 'info' as const;
      default:
        return 'gray' as const;
    }
  };

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-6)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--spacing-2)' }}>Users</h1>
          <p className="text-secondary">Manage workshop users and their roles</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/users/create">
            <Button variant="primary">+ Add User</Button>
          </Link>
        )}
      </div>

      {users.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center" style={{ padding: 'var(--spacing-8)' }}>
              <p className="text-secondary" style={{ marginBottom: 'var(--spacing-4)' }}>
                No users found
              </p>
              {isAdmin && (
                <Link href="/dashboard/users/create">
                  <Button variant="primary">Add Your First User</Button>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--spacing-4)' }}>
          {users.map((user: typeof users[number]) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{user.name || 'Unnamed User'}</CardTitle>
                    <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-2)' }}>
                      {user.email}
                    </p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </CardBody>
              {isAdmin && user.id !== session.user.id && (
                <div className="flex gap-2" style={{ padding: 'var(--spacing-4)', paddingTop: '0' }}>
                  <Link href={`/dashboard/users/${user.id}/edit`} style={{ flex: 1 }}>
                    <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                      Edit
                    </Button>
                  </Link>
                  <DeleteUserButton userId={user.id} userName={user.name || user.email} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}