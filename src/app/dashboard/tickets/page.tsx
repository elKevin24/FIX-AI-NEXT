import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import styles from './tickets.module.css';

export default async function TicketsPage() {
    const session = await auth();

    if (!session?.user) {
        return <div>Error: Not authenticated</div>;
    }

    // Super Admin: adminkev@example.com puede ver TODO
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    // Query condicional: Super admin ve todo, otros solo su tenant
    const tickets = await prisma.ticket.findMany({
        where: isSuperAdmin ? {} : {
            tenantId: session.user.tenantId,
        },
        include: {
            customer: true,
            assignedTo: true,
            tenant: true, // Para mostrar el tenant en la tabla si es super admin
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    // Debug info (console only)
    if (isSuperAdmin) {
        console.log('👑 Super Admin accessing all tickets');
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Tickets</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Link href="/dashboard/tickets/create" className={styles.createBtn}>
                    New Ticket
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Customer</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((ticket) => (
                            <tr key={ticket.id}>
                                <td>{ticket.id.slice(0, 8)}</td>
                                <td>{ticket.title}</td>
                                <td>{ticket.customer.name}</td>
                                {isSuperAdmin && <td>{ticket.tenant.name}</td>}
                                <td>
                                    <span className={`${styles.status} ${styles[ticket.status.toLowerCase()]}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>{ticket.assignedTo?.name || 'Unassigned'}</td>
                                <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <Link href={`/dashboard/tickets/${ticket.id}`} className={styles.viewLink}>
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>No tickets found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
