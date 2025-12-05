import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';

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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Users</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Role</th>
                            <th>Assigned Tickets</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name || '-'}</td>
                                <td>{user.email}</td>
                                {isSuperAdmin && <td>{user.tenant.name}</td>}
                                <td>
                                    <span className={`${styles.status}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>{user._count.assignedTickets}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 6 : 5} className={styles.empty}>No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
