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
    const lowStockThreshold = 5;
    const lowStockCount = parts.filter((p: typeof parts[number]) => p.quantity <= lowStockThreshold).length;
    const totalValue = parts.reduce((sum: number, part: typeof parts[number]) => {
        return sum + (Number(part.price) * part.quantity);
    }, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>Inventario de Repuestos</h1>
                    {lowStockCount > 0 && (
                        <p style={{ color: '#dc2626', fontWeight: 600, marginTop: '0.5rem' }}>
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
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
            }}>
                <div style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #eaeaea',
                }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Total Repuestos
                    </h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                        {parts.length}
                    </p>
                </div>
                <div style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #eaeaea',
                }}>
                    <h3 style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                        Valor Total Inventario
                    </h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                        ${totalValue.toFixed(2)}
                    </p>
                </div>
                <div style={{
                    background: lowStockCount > 0 ? '#fee2e2' : '#fff',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: `1px solid ${lowStockCount > 0 ? '#fecaca' : '#eaeaea'}`,
                }}>
                    <h3 style={{ fontSize: '0.875rem', color: lowStockCount > 0 ? '#991b1b' : '#666', marginBottom: '0.5rem' }}>
                        Stock Bajo (≤{lowStockThreshold})
                    </h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: lowStockCount > 0 ? '#dc2626' : 'inherit' }}>
                        {lowStockCount}
                    </p>
                </div>
            </div>

            <div className={styles.resultsInfo}>
                {parts.length > 0 ? (
                    <p>Mostrando {parts.length} repuesto{parts.length !== 1 ? 's' : ''}</p>
                ) : (
                    <p>No se encontraron repuestos</p>
                )}
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>SKU</th>
                            <th>Cantidad</th>
                            <th>Costo</th>
                            <th>Precio</th>
                            <th>Margen</th>
                            <th>Veces Usado</th>
                            {isSuperAdmin && <th>Tenant</th>}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((part: typeof parts[number]) => {
                            const cost = Number(part.cost);
                            const price = Number(part.price);
                            const margin = cost > 0 ? ((price - cost) / cost * 100) : 0;
                            const isLowStock = part.quantity <= lowStockThreshold;
                            const timesUsed = part.usages.reduce((sum: number, usage: typeof part.usages[number]) => sum + usage.quantity, 0);

                            return (
                                <tr key={part.id} style={isLowStock ? { backgroundColor: '#fef2f2' } : undefined}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {part.name}
                                            {isLowStock && (
                                                <span style={{
                                                    padding: '0.125rem 0.5rem',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#991b1b',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                }}>
                                                    Stock Bajo
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{part.sku || '-'}</td>
                                    <td>
                                        <span style={{
                                            fontWeight: 600,
                                            color: isLowStock ? '#dc2626' : 'inherit'
                                        }}>
                                            {part.quantity}
                                        </span>
                                    </td>
                                    <td>${cost.toFixed(2)}</td>
                                    <td>${price.toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            color: margin > 0 ? '#10b981' : margin < 0 ? '#dc2626' : 'inherit'
                                        }}>
                                            {margin > 0 ? '+' : ''}{margin.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td>{timesUsed}</td>
                                    {isSuperAdmin && <td>{part.tenant.name}</td>}
                                    <td>
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
