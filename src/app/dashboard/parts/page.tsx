import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { Button } from '@/components/ui';
import Link from 'next/link';
import styles from './parts.module.css';
import PartsClient from './PartsClient';

export default async function PartsPage() {
    const session = await auth();

    if (!session?.user?.tenantId) {
        redirect('/login');
    }

    const db = getTenantPrisma(session.user.tenantId);

    const parts = await db.part.findMany({
        orderBy: {
            updatedAt: 'desc',
        },
    });

    // Calcular estadísticas
    const totalParts = parts.length;
    const lowStockParts = parts.filter((p: any) => p.quantity <= p.minStock).length;
    const totalValue = parts.reduce((acc: number, p: any) => acc + (Number(p.cost) * p.quantity), 0);

    // Convert Decimal to number for client component
    const serializedParts = parts.map((part: any) => ({
        ...part,
        cost: Number(part.cost),
        price: Number(part.price),
    }));

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Inventario</h1>
                    <p>Gestiona repuestos y control de stock</p>
                    {lowStockParts > 0 && (
                        <p className={styles.lowStockWarning}>
                            ⚠️ Hay {lowStockParts} producto(s) con stock bajo
                        </p>
                    )}
                </div>
                <Button as={Link} href="/dashboard/parts/create" variant="primary">
                    + Nuevo Repuesto
                </Button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Items</span>
                    <p className={styles.statValue}>{totalParts}</p>
                </div>
                <div className={`${styles.statCard} ${lowStockParts > 0 ? styles.lowStock : ''}`}>
                    <span className={styles.statLabel}>Stock Bajo</span>
                    <p className={styles.statValue}>{lowStockParts}</p>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Valor Inventario (Costo)</span>
                    <p className={styles.statValue}>Q{totalValue.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <PartsClient data={serializedParts} />
        </div>
    );
}