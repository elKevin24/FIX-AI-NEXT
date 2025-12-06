import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';
import Link from 'next/link';

export default async function UsersPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    // Solo admins pueden ver la lista de usuarios
    if (session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const users = await prisma.user.findMany({
        where: isSuperAdmin ? {} : {
            tenantId: session.user.tenantId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            tenant: {
                select: {
                    name: true,
                },
            },
            _count: {
                select: {
                    assignedTickets: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

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
            </div>
        </div>
    );
}
