import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';

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
            tenant: true, // Incluir tenant para mostrarlo si es admin
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Customers</h1>
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
                            <th>Phone</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Total Tickets</th>
                            <th>Active Tickets</th>
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
                                    <td>{activeTickets}</td>
                                </tr>
                            );
                        })}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 6 : 5} className={styles.empty}>No customers found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
