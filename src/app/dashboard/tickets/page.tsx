import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Suspense } from 'react';
import TicketSearchFilters from './TicketSearchFilters';
import styles from './tickets.module.css';

interface TicketsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
    }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
    const session = await auth();

    if (!session?.user) {
        return <div>Error: Not authenticated</div>;
    }

    const params = await searchParams;
    const { search, status, priority, assignedTo } = params;

    // Super Admin: adminkev@example.com puede ver TODO
    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    // Construir el where clause dinámicamente
    const where: any = isSuperAdmin ? {} : {
        tenantId: session.user.tenantId,
    };

    // Filtro de búsqueda (ID, título o cliente)
    if (search) {
        where.AND = where.AND || [];
        where.AND.push({
            OR: [
                { id: { contains: search } },
                { title: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
            ],
        });
    }

    // Filtro de estado
    if (status) {
        where.status = status;
    }

    // Filtro de prioridad
    if (priority) {
        where.priority = priority;
    }

    // Filtro de asignado
    if (assignedTo) {
        where.assignedTo = {
            email: { contains: assignedTo, mode: 'insensitive' },
        };
    }

    // Query con filtros
    const tickets = await prisma.ticket.findMany({
        where,
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

            <Suspense fallback={<div>Cargando filtros...</div>}>
                <TicketSearchFilters />
            </Suspense>

            <div className={styles.resultsInfo}>
                {tickets.length > 0 ? (
                    <p>Mostrando {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
                ) : (
                    <p>No se encontraron tickets</p>
                )}
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
                        {tickets.map((ticket: typeof tickets[number]) => (
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
