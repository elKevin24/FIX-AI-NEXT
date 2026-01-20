import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'TECHNICIAN': return 'Técnico';
      case 'RECEPTIONIST': return 'Recepcionista';
      default: return role;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (!name) return email.slice(0, 2).toUpperCase();
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Equipo</h1>
          <p>Gestiona los perfiles y accesos de tu equipo técnico.</p>
        </div>
        <Link href="/dashboard/users/create">
          <Button variant="primary">
            <span>+</span> Nuevo Usuario
          </Button>
        </Link>
      </header>

      <div className={styles.usersGrid}>
        {users.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No se han encontrado usuarios registrados.</p>
          </div>
        ) : (
          users.map((user: any) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userAvatar}>
                {getInitials(user.name, user.email)}
              </div>
              
              <div className={styles.userInfo}>
                <h3 className={styles.userName}>{user.name || 'Sin nombre'}</h3>
                <span className={styles.userEmail}>{user.email}</span>
              </div>

              <div className={styles.roleBadge}>
                {getRoleLabel(user.role)}
              </div>

              <div className={styles.actions}>
                <Link href={`/dashboard/users/${user.id}/edit`} className={styles.btnAction} title="Editar Perfil">
                  <EditIcon />
                  Editar
                </Link>
                {user.id !== session.user.id && (
                  <DeleteUserButton 
                    userId={user.id} 
                    userName={user.name || user.email} 
                    className={styles.btnAction}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}
