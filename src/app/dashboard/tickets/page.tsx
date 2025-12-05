import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import styles from './tickets.module.css';

export default async function TicketsPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        return <div>Error: No tenant found</div>;
    }

    const tickets = await prisma.ticket.findMany({
        where: {
            tenantId: session.user.tenantId,
        },
        include: {
            customer: true,
            assignedTo: true,
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Tickets</h1>
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
                                <td colSpan={7} className={styles.empty}>No tickets found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
