import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import styles from '../tickets/tickets.module.css';

export default async function PartsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const isSuperAdmin = session.user.email === 'adminkev@example.com';

    // Build the where clause
    const where: any = isSuperAdmin ? {} : {
        tenantId: session.user.tenantId,
    };

    // Fetch parts with usage stats
    const parts = await prisma.part.findMany({
        where,
        include: {
            tenant: {
                select: {
                    id: true,
                    name: true,
                },
            },
            usages: {
                select: {
                    id: true,
                    quantity: true,
                },
            },
        },
        orderBy: {
            name: 'asc',
        },
    });

    // Calculate total value and low stock count
    const lowStockCount = parts.filter((p: any) => p.quantity <= p.minStock).length;
    const totalValue = parts.reduce((sum: number, part: any) => {
        return sum + (Number(part.price) * part.quantity);
    }, 0);

    const formatCurrency = (val: number) => `Q${val.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Inventario de Repuestos</h1>
                    {lowStockCount > 0 && (
                        <p className={styles.textDanger} style={{ fontWeight: 600, marginTop: '0.5rem' }}>
                            ⚠️ {lowStockCount} repuesto{lowStockCount !== 1 ? 's' : ''} con stock bajo
                        </p>
                    )}
                </div>
                {isSuperAdmin && (
                    <span className={styles.superAdminBadge}>
                        👑 Super Admin
                    </span>
                )}
                <Link href="/dashboard/parts/create" className={styles.createBtn}>
                    + Nuevo Repuesto
                </Link>
            </div>

            {/* Summary Cards */}
            <div className={styles.gridTwoColumns} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className={styles.section} style={{ padding: '1.5rem', marginTop: 0 }}>
                    <h3 className={styles.summaryLabel}>Total Repuestos</h3>
                    <p className={styles.summaryValue} style={{ fontSize: '2rem' }}>{parts.length}</p>
                </div>
                
                <div className={styles.section} style={{ padding: '1.5rem', marginTop: 0 }}>
                    <h3 className={styles.summaryLabel}>Valor Total (Precio Venta)</h3>
                    <p className={styles.summaryValue} style={{ fontSize: '2rem' }}>{formatCurrency(totalValue)}</p>
                </div>

                <div className={`${styles.section} ${lowStockCount > 0 ? styles.dangerZone : ''}`} style={{ padding: '1.5rem', marginTop: 0, borderColor: lowStockCount > 0 ? 'var(--color-error-200)' : 'var(--color-border-light)' }}>
                    <h3 className={styles.summaryLabel} style={{ color: lowStockCount > 0 ? 'var(--color-error-700)' : 'inherit' }}>
                        Alertas de Stock
                    </h3>
                    <p className={styles.summaryValue} style={{ fontSize: '2rem', color: lowStockCount > 0 ? 'var(--color-error-600)' : 'inherit' }}>
                        {lowStockCount}
                    </p>
                </div>
            </div>

            <div className={styles.resultsInfo}>
                <p>
                    {parts.length > 0 
                        ? `Mostrando ${parts.length} repuesto${parts.length !== 1 ? 's' : ''}` 
                        : 'No se encontraron repuestos'}
                </p>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeaderRow}>
                            <th>Nombre</th>
                            <th>SKU</th>
                            <th style={{ textAlign: 'center' }}>Cantidad</th>
                            <th style={{ textAlign: 'right' }}>Costo</th>
                            <th style={{ textAlign: 'right' }}>Precio</th>
                            <th style={{ textAlign: 'right' }}>Margen</th>
                            <th style={{ textAlign: 'center' }}>Uso</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((part: any) => {
                            const cost = Number(part.cost);
                            const price = Number(part.price);
                            const margin = cost > 0 ? ((price - cost) / cost * 100) : 0;
                            const isLowStock = part.quantity <= part.minStock;
                            const timesUsed = part.usages.reduce((sum: number, usage: any) => sum + usage.quantity, 0);

                            return (
                                <tr key={part.id} className={styles.tableRow} style={isLowStock ? { backgroundColor: 'var(--color-error-50)' } : undefined}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong>{part.name}</strong>
                                            {isLowStock && (
                                                <span className={`${styles.status} ${styles.textDanger}`} style={{ backgroundColor: 'var(--color-error-100)', fontSize: '0.65rem' }}>
                                                    Bajo Stock
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.textMuted}>{part.sku || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <strong className={isLowStock ? styles.textDanger : ''}>
                                            {part.quantity}
                                        </strong>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(cost)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(price)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className={margin > 0 ? styles.textSuccess : margin < 0 ? styles.textDanger : ''}>
                                            {margin > 0 ? '+' : ''}{margin.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{timesUsed}</td>
                                    {isSuperAdmin && <td>{part.tenant.name}</td>}
                                    <td style={{ textAlign: 'center' }}>
                                        <Link
                                            href={`/dashboard/parts/${part.id}/edit`}
                                            className={styles.viewLink}
                                        >
                                            Editar
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {parts.length === 0 && (
                            <tr>
                                <td colSpan={isSuperAdmin ? 9 : 8} className={styles.empty}>
                                    No se encontraron repuestos. Crea el primero para comenzar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}