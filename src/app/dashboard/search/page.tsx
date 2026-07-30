import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';
import Link from 'next/link';

interface Props {
    searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
    const params = await searchParams;
    const query = params.q || '';
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const tenantFilter = isSuperAdmin ? {} : { tenantId: session.user.tenantId };

    // Check if query is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    // Search tickets
    const tickets = query.length >= 2 ? await prisma.ticket.findMany({
        where: {
            ...tenantFilter,
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { ticketNumber: { contains: query, mode: 'insensitive' } },
                { customer: { name: { contains: query, mode: 'insensitive' } } },
                ...(isUuid ? [{ id: query }] : []),
            ],
        },
        include: {
            customer: {
                select: { name: true },
            },
            assignedTo: {
                select: { name: true },
            },
        },
        orderBy: { updatedAt: 'desc' },
    }) : [];

    // Search customers
    const customers = query.length >= 2 ? await prisma.customer.findMany({
        where: {
            ...tenantFilter,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } },
            ],
        },
        include: {
            _count: {
                select: { tickets: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    }) : [];

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

    const totalResults = tickets.length + customers.length;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Resultados de Búsqueda</h1>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
            </div>

            <div style={{ marginBottom: '1.5rem', color: '#666' }}>
                {query ? (
                    <>
                        Búsqueda: <strong>&quot;{query}&quot;</strong> - {totalResults} resultado(s) encontrado(s)
                    </>
                ) : (
                    'Ingresa un término de búsqueda (mínimo 2 caracteres)'
                )}
            </div>

            {/* Tickets Results */}
            {tickets.length > 0 && (
                <>
                    <h2 style={{ marginBottom: '1rem' }}>Tickets ({tickets.length})</h2>
                    <div className={styles.tableContainer} style={{ marginBottom: '2rem' }}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Título</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Asignado a</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket: typeof tickets[number]) => (
                                    <tr key={ticket.id}>
                                        <td>{ticket.id.slice(0, 8)}</td>
                                        <td>{ticket.title}</td>
                                        <td>{ticket.customer.name}</td>
                                        <td>
                                            <span className={`${styles.status} ${styles[ticket.status.toLowerCase()]}`}>
                                                {getStatusLabel(ticket.status)}
                                            </span>
                                        </td>
                                        <td>{ticket.assignedTo?.name || 'Sin asignar'}</td>
                                        <td>
                                            <Link href={`/dashboard/tickets/${ticket.id}`} className={styles.viewLink}>
                                                Ver
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Customers Results */}
            {customers.length > 0 && (
                <>
                    <h2 style={{ marginBottom: '1rem' }}>Clientes ({customers.length})</h2>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Teléfono</th>
                                    <th>Tickets</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer: typeof customers[number]) => (
                                    <tr key={customer.id}>
                                        <td>{customer.name}</td>
                                        <td>{customer.email || '-'}</td>
                                        <td>{customer.phone || '-'}</td>
                                        <td>{customer._count.tickets}</td>
                                        <td>
                                            <Link href={`/dashboard/customers/${customer.id}/edit`} className={styles.viewLink}>
                                                Ver
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {query.length >= 2 && totalResults === 0 && (
                <div className={styles.tableContainer} style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: '#666', fontSize: '1.1rem' }}>
                        No se encontraron resultados para &quot;{query}&quot;
                    </p>
                    <p style={{ color: '#999', marginTop: '0.5rem' }}>
                        Intenta con otros términos de búsqueda
                    </p>
                </div>
            )}
        </div>
    );
}
