import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';
import Link from 'next/link';

export default async function CustomersPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    const customers = await prisma.customer.findMany({
        where: isSuperAdmin ? {} : {
            tenantId: session.user.tenantId,
        },
        include: {
            tickets: {
                select: {
                    id: true,
                    status: true,
                },
            },
            tenant: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Clientes</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Link href="/dashboard/customers/create" className={styles.createBtn}>
                    + Nuevo Cliente
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Total Tickets</th>
                            <th>Tickets Activos</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((customer) => {
                            const activeTickets = customer.tickets.filter(
                                t => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
                            ).length;

                            return (
                                <tr key={customer.id}>
                                    <td>{customer.name}</td>
                                    <td>{customer.email || '-'}</td>
                                    <td>{customer.phone || '-'}</td>
                                    {isSuperAdmin && <td>{customer.tenant.name}</td>}
                                    <td>{customer.tickets.length}</td>
                                    <td>
                                        <span className={`${styles.status} ${activeTickets > 0 ? styles.in_progress : styles.closed}`}>
                                            {activeTickets}
                                        </span>
                                    </td>
                                    <td>
                                        <Link
                                            href={`/dashboard/customers/${customer.id}/edit`}
                                            className={styles.viewLink}
                                        >
                                            Editar
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 7 : 6} className={styles.empty}>
                                    No se encontraron clientes
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
