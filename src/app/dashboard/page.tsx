import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import styles from './page.module.css';

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    // Fetch real statistics
    const [activeTickets, pendingParts, completedToday, totalCustomers] = await Promise.all([
        // Active tickets (OPEN + IN_PROGRESS)
        prisma.ticket.count({
            where: {
                tenantId: session.user.tenantId,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
        }),
        // Tickets waiting for parts
        prisma.ticket.count({
            where: {
                tenantId: session.user.tenantId,
                status: 'WAITING_FOR_PARTS',
            },
        }),
        // Completed today
        prisma.ticket.count({
            where: {
                tenantId: session.user.tenantId,
                status: 'RESOLVED',
                updatedAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        }),
        // Total customers
        prisma.customer.count({
            where: {
                tenantId: session.user.tenantId,
            },
        }),
    ]);

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <h1>Dashboard</h1>
                <p>Welcome back, {session?.user?.name || session?.user?.email}</p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.card}>
                    <h3>Active Tickets</h3>
                    <p className={styles.statValue}>{activeTickets}</p>
                    <p className={styles.statLabel}>Open + In Progress</p>
                </div>
                <div className={styles.card}>
                    <h3>Waiting for Parts</h3>
                    <p className={styles.statValue}>{pendingParts}</p>
                    <p className={styles.statLabel}>Pending inventory</p>
                </div>
                <div className={styles.card}>
                    <h3>Completed Today</h3>
                    <p className={styles.statValue}>{completedToday}</p>
                    <p className={styles.statLabel}>Resolved tickets</p>
                </div>
                <div className={styles.card}>
                    <h3>Total Customers</h3>
                    <p className={styles.statValue}>{totalCustomers}</p>
                    <p className={styles.statLabel}>In database</p>
                </div>
            </div>
        </div>
    );
}
