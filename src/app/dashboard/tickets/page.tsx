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

    // Debug: Ver todos los tickets sin filtro
    const allTickets = await prisma.ticket.findMany({
        include: {
            customer: true,
            assignedTo: true,
            tenant: true, // Incluir tenant para mostrar a cuál pertenece
        },
    });

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

    // Debug info
    console.log('🔍 DEBUG INFO:');
    console.log('User email:', session.user.email);
    console.log('Is Super Admin:', isSuperAdmin);
    console.log('Session tenantId:', session.user.tenantId);
    console.log('All tickets in DB:', allTickets.length);
    console.log('Filtered tickets:', tickets.length);


    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Tickets</h1>
                <Link href="/dashboard/tickets/create" className={styles.createBtn}>
                    New Ticket
                </Link>
            </div>

            {/* Debug Info - Temporal */}
            <div style={{ background: isSuperAdmin ? '#d4edda' : '#fff3cd', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: `1px solid ${isSuperAdmin ? '#28a745' : '#ffc107'}` }}>
                <strong>{isSuperAdmin ? '� SUPER ADMIN MODE' : '�🔍 Debug Info:'}</strong>
                <br />
                User: {session.user.email}
                <br />
                {isSuperAdmin ? (
                    <>Viewing ALL tickets from ALL tenants</>
                ) : (
                    <>Viewing only tickets from your tenant: {session.user.tenantId}</>
                )}
                <br />
                Total tickets showing: {tickets.length}
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
