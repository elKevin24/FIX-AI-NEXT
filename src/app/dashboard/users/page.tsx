import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';
import styles from './users.module.css';

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'TECHNICIAN':
        return 'Técnico';
      case 'RECEPTIONIST':
        return 'Recepcionista';
      default:
        return role;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Usuarios</h1>
          <p>Administra los usuarios y sus roles</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/users/create">
            <Button variant="primary">+ Nuevo Usuario</Button>
          </Link>
        )}
      </div>

      {users.length === 0 ? (
        <Card>
          <CardBody>
            <div className={styles.emptyState}>
              <p>No hay usuarios registrados</p>
              {isAdmin && (
                <Link href="/dashboard/users/create">
                  <Button variant="primary">Agregar Primer Usuario</Button>
                </Link>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className={styles.usersGrid}>
          {users.map((user) => (
            <Card key={user.id} className={styles.userCard}>
              <CardHeader>
                <div className={styles.cardHeader}>
                  <div className={styles.userInfo}>
                    <h3 className={styles.userName}>{user.name || 'Sin nombre'}</h3>
                    <p className={styles.userEmail}>{user.email}</p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className={styles.userMeta}>
                  Creado: {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </div>
              </CardBody>
              {isAdmin && user.id !== session.user.id && (
                <div className={styles.cardActions}>
                  <Link href={`/dashboard/users/${user.id}/edit`}>
                    <Button variant="secondary" size="sm">
                      Editar
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