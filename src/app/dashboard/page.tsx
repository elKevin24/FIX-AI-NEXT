import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Define types locally since they may not be exported yet
enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTS = 'WAITING_FOR_PARTS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}
import styles from './page.module.css';
import TicketsByStatusChart from '@/components/dashboard/TicketsByStatusChart';
import UrgentTicketsWidget from '@/components/dashboard/UrgentTicketsWidget';
import TechnicianMetrics from '@/components/dashboard/TechnicianMetrics';
import GlobalSearch from '@/components/GlobalSearch';
import { StatCard } from '@/components/dashboard/StatCard';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';
    const tenantId = session.user.tenantId;

    // Fetch all statistics in parallel
    const [
        activeTickets,
        pendingParts,
        completedToday,
        totalCustomers,
        ticketsByStatus,
        urgentTickets,
        technicianStats,
        recentTickets,
    ] = await Promise.all([
        // Active tickets (OPEN + IN_PROGRESS)
        prisma.ticket.count({
            where: {
                tenantId,
                status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
            },
        }),
        // Tickets waiting for parts
        prisma.ticket.count({
            where: {
                tenantId,
                status: TicketStatus.WAITING_FOR_PARTS,
            },
        }),
        // Completed today
        prisma.ticket.count({
            where: {
                tenantId,
                status: TicketStatus.RESOLVED,
                updatedAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        }),
        // Total customers
        prisma.customer.count({
            where: { tenantId },
        }),
        // Tickets grouped by status
        prisma.ticket.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: {
                id: true,
            },
        }),
        // Urgent tickets (HIGH or URGENT priority, not resolved/closed)
        prisma.ticket.findMany({
            where: {
                tenantId,
                priority: { in: [TicketPriority.HIGH, TicketPriority.URGENT] },
                status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
            },
            include: {
                customer: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
            take: 10,
        }),
        // Technician statistics
        prisma.user.findMany({
            where: {
                tenantId,
                role: { in: ['TECHNICIAN', 'ADMIN'] },
            },
            select: {
                id: true,
                name: true,
                email: true,
                assignedTickets: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        }),
        // Recent tickets (last 5)
        prisma.ticket.findMany({
            where: { tenantId },
            include: {
                customer: {
                    select: {
                        name: true,
                    },
                },
                assignedTo: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                updatedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 5,
        }),
    ]);

    // Transform tickets by status for chart
    const statusChartData = ticketsByStatus.map((item: typeof ticketsByStatus[number]) => ({
        status: item.status,
        count: item._count.id,
    }));

    // Calculate technician metrics
    const technicianMetrics = technicianStats.map((tech: typeof technicianStats[number]) => {
        const completed = tech.assignedTickets.filter((t: typeof tech.assignedTickets[number]) =>
            t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
        ).length;

        const inProgress = tech.assignedTickets.filter((t: typeof tech.assignedTickets[number]) =>
            t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.WAITING_FOR_PARTS
        ).length;

        // Calculate average days to complete
        const completedTickets = tech.assignedTickets.filter((t: typeof tech.assignedTickets[number]) =>
            t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
        );

        let avgDays = 0;
        if (completedTickets.length > 0) {
            const totalDays = completedTickets.reduce((sum: number, ticket: typeof completedTickets[number]) => {
                const days = Math.floor(
                    (new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + days;
            }, 0);
            avgDays = totalDays / completedTickets.length;
        }

        return {
            name: tech.name || '',
            email: tech.email,
            completed,
            inProgress,
            avgDays,
        };
    });

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div>
                    <h1>Dashboard</h1>
                    <p>Bienvenido de vuelta, {session?.user?.name || session?.user?.email}</p>
                </div>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>👑 Super Admin</span>
                )}
            </header>

            <div className={styles.searchBar}>
                <GlobalSearch />
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard 
                    title="Tickets Activos"
                    value={activeTickets}
                    label="Abiertos + En Progreso"
                    icon="📊"
                    iconBgColor="#dbeafe"
                    iconColor="#1e40af"
                />
                <StatCard 
                    title="Esperando Repuestos"
                    value={pendingParts}
                    label="Inventario pendiente"
                    icon="⏳"
                    iconBgColor="#fef3c7"
                    iconColor="#92400e"
                />
                <StatCard 
                    title="Completados Hoy"
                    value={completedToday}
                    label="Tickets resueltos"
                    icon="✓"
                    iconBgColor="#d1fae5"
                    iconColor="#065f46"
                />
                <StatCard 
                    title="Total Clientes"
                    value={totalCustomers}
                    label="En base de datos"
                    icon="👥"
                    iconBgColor="#e0e7ff"
                    iconColor="#3730a3"
                />
            </div>

            {/* Charts and Widgets Grid */}
            <div className={styles.chartsGrid}>
                {/* Tickets by Status */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>Tickets por Estado</h2>
                    <TicketsByStatusChart data={statusChartData} />
                </div>

                {/* Urgent Tickets */}
                <div className={styles.chartCard}>
                    <h2 className={styles.chartTitle}>
                        Tickets Urgentes
                        {urgentTickets.length > 0 && (
                            <span className={styles.urgentBadge}>{urgentTickets.length}</span>
                        )}
                    </h2>
                    <UrgentTicketsWidget tickets={urgentTickets} />
                </div>
            </div>

            {/* Technician Metrics */}
            {technicianMetrics.length > 0 && (
                <div className={styles.fullWidthCard}>
                    <h2 className={styles.chartTitle}>Productividad por Técnico</h2>
                    <TechnicianMetrics data={technicianMetrics} />
                </div>
            )}

            {/* Recent Tickets */}
            {recentTickets.length > 0 && (
                <div className={styles.fullWidthCard}>
                    <h2 className={styles.chartTitle}>Tickets Recientes</h2>
                    <div className={styles.recentTicketsTable}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Título</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Asignado a</th>
                                    <th>Creado por</th>
                                    <th>Modificado por</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTickets.map((ticket: typeof recentTickets[number]) => (
                                    <tr key={ticket.id}>
                                        <td>
                                            <a href={`/dashboard/tickets/${ticket.id}`} className={styles.ticketLink}>
                                                {ticket.id.slice(0, 8)}
                                            </a>
                                        </td>
                                        <td>{ticket.title}</td>
                                        <td>{ticket.customer.name}</td>
                                        <td>
                                            <TicketStatusBadge status={ticket.status} />
                                        </td>
                                        <td>{ticket.assignedTo?.name || ticket.assignedTo?.email || 'Sin asignar'}</td>
                                        <td>
                                            <span className={styles.auditInfo}>
                                                {ticket.createdBy?.name || ticket.createdBy?.email || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.auditInfo}>
                                                {ticket.updatedBy?.name || ticket.updatedBy?.email || '-'}
                                            </span>
                                        </td>
                                        <td>{new Date(ticket.createdAt).toLocaleDateString('es-ES')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
