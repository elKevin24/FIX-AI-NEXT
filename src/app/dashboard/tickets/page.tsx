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

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'OPEN': 'Abierto',
            'IN_PROGRESS': 'En Progreso',
            'WAITING_FOR_PARTS': 'Esperando Repuestos',
            'RESOLVED': 'Resuelto',
            'CLOSED': 'Cerrado',
        };
        return labels[status] || status;
    };

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
                    + Nuevo Ticket
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Cliente</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Estado</th>
                            <th>Asignado a</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
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
                                        {getStatusLabel(ticket.status)}
                                    </span>
                                </td>
                                <td>{ticket.assignedTo?.name || 'Sin asignar'}</td>
                                <td>{new Date(ticket.createdAt).toLocaleDateString('es-ES')}</td>
                                <td>
                                    <Link href={`/dashboard/tickets/${ticket.id}`} className={styles.viewLink}>
                                        Ver
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {tickets.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 8 : 7} className={styles.empty}>No se encontraron tickets</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
