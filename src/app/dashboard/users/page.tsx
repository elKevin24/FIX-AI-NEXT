import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';
import Link from 'next/link';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import DeleteUserButton from './DeleteUserButton';

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect('/login');
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

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return styles.resolved;
            case 'TECHNICIAN':
                return styles.in_progress;
            case 'RECEPTIONIST':
                return styles.open;
            default:
                return '';
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
                <h1>Usuarios</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Link href="/dashboard/users/create" className={styles.createBtn}>
                    + Nuevo Usuario
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Rol</th>
                            <th>Tickets Asignados</th>
                            <th>Fecha Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name || '-'}</td>
                                <td>{user.email}</td>
                                {isSuperAdmin && <td>{user.tenant.name}</td>}
                                <td>
                                    <span className={`${styles.status} ${getRoleBadgeClass(user.role)}`}>
                                        {getRoleLabel(user.role)}
                                    </span>
                                </td>
                                <td>{user._count.assignedTickets}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString('es-ES')}</td>
                                <td>
                                    <Link
                                        href={`/dashboard/users/${user.id}/edit`}
                                        className={styles.viewLink}
                                    >
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 7 : 6} className={styles.empty}>
                                    No se encontraron usuarios
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
          {users.map((user) => (
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
