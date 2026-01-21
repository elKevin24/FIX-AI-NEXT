'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { POSSaleStatus, PaymentMethod } from '@prisma/client';
import { voidPOSSale, getPOSSales } from '@/lib/pos-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import styles from './history.module.css';

// ... (Types remain the same)
interface SaleItem {
    id: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface SalePayment {
    paymentMethod: PaymentMethod;
    amount: number;
}

interface Sale {
    id: string;
    saleNumber: string;
    customerName: string;
    customerNIT: string | null;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    amountPaid: number;
    changeGiven: number;
    status: POSSaleStatus;
    notes: string | null;
    createdAt: Date;
    customer: { id: string; name: string } | null;
    items: SaleItem[];
    payments: SalePayment[];
    createdBy: { name: string | null; email: string } | null;
}

interface Stats {
    salesCount: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    byPaymentMethod: Record<string, number>;
}

interface SalesHistoryClientProps {
    initialSales: Sale[];
    stats: Stats | null;
}

export default function SalesHistoryClient({ initialSales, stats }: SalesHistoryClientProps) {
    const router = useRouter();
    const [sales, setSales] = useState<Sale[]>(initialSales);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<POSSaleStatus | ''>('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [isVoiding, setIsVoiding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Format currency
    const formatCurrency = (amount: number) => `Q${amount.toFixed(2)}`;

    // Format date
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status badge
    const getStatusBadge = (status: POSSaleStatus) => {
        const variants: Record<POSSaleStatus, 'success' | 'error' | 'warning' | 'info'> = {
            COMPLETED: 'success',
            VOIDED: 'error',
            PARTIALLY_REFUNDED: 'warning',
            FULLY_REFUNDED: 'info',
        };
        const labels: Record<POSSaleStatus, string> = {
            COMPLETED: 'Completada',
            VOIDED: 'Anulada',
            PARTIALLY_REFUNDED: 'Reembolso Parcial',
            FULLY_REFUNDED: 'Reembolso Total',
        };
        return <Badge variant={variants[status]}>{labels[status]}</Badge>;
    };

    // Get payment method label
    const getPaymentMethodLabel = (method: PaymentMethod) => {
        const labels: Record<PaymentMethod, string> = {
            CASH: 'Efectivo',
            CARD: 'Tarjeta',
            TRANSFER: 'Transferencia',
            CHECK: 'Cheque',
            OTHER: 'Otro',
        };
        return labels[method];
    };

    // Filter sales
    const filteredSales = sales.filter(sale => {
        const matchesSearch = !search ||
            sale.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
            sale.customerName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || sale.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handle void sale
    const handleVoidSale = async () => {
        if (!selectedSale || !voidReason.trim()) {
            setError('Ingrese una razón para anular');
            return;
        }

        setIsVoiding(true);
        setError(null);

        try {
            await voidPOSSale(selectedSale.id, voidReason);
            setSuccess(`Venta ${selectedSale.saleNumber} anulada exitosamente`);
            setShowVoidModal(false);
            setVoidReason('');
            setSelectedSale(null);

            // Refresh sales
            const updatedSales = await getPOSSales();
            setSales(updatedSales);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al anular la venta');
        } finally {
            setIsVoiding(false);
        }
    };

    // Define columns
    const columns: ColumnDef<Sale>[] = useMemo(() => [
        {
            accessorKey: 'saleNumber',
            header: 'Número',
            cell: ({ row }) => <span className="font-bold text-gray-800">{row.original.saleNumber}</span>,
        },
        {
            accessorKey: 'createdAt',
            header: 'Fecha',
            cell: ({ row }) => formatDate(row.original.createdAt),
        },
        {
            accessorKey: 'customerName',
            header: 'Cliente',
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.customerName}</span>
                    {row.original.customerNIT && row.original.customerNIT !== 'C/F' && (
                        <span className="text-xs text-gray-500">NIT: {row.original.customerNIT}</span>
                    )}
                </div>
            ),
        },
        {
            id: 'items',
            header: 'Items',
            cell: ({ row }) => `${row.original.items.length} productos`,
        },
        {
            accessorKey: 'total',
            header: 'Total',
            cell: ({ row }) => <span className="font-bold">{formatCurrency(row.original.total)}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Estado',
            cell: ({ row }) => getStatusBadge(row.original.status),
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSale(row.original)}
                    >
                        Ver
                    </Button>
                    {row.original.status === POSSaleStatus.COMPLETED && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedSale(row.original);
                                setShowVoidModal(true);
                            }}
                        >
                            Anular
                        </Button>
                    )}
                </div>
            ),
        },
    ], []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Historial de Ventas</h1>
                    <p className={styles.subtitle}>
                        {stats ? `${stats.salesCount} ventas · Total: ${formatCurrency(stats.totalSales)}` : ''}
                    </p>
                </div>
                <Button variant="primary" onClick={() => router.push('/dashboard/pos')}>
                    Nueva Venta
                </Button>
            </header>

            {error && <Alert variant="error" className={styles.alert}>{error}</Alert>}
            {success && <Alert variant="success" className={styles.alert}>{success}</Alert>}

            {/* Stats Cards */}
            {stats && (
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Ventas</span>
                        <span className={styles.statValue}>{formatCurrency(stats.totalSales)}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Cantidad</span>
                        <span className={styles.statValue}>{stats.salesCount}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>IVA Recaudado</span>
                        <span className={styles.statValue}>{formatCurrency(stats.totalTax)}</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Descuentos</span>
                        <span className={styles.statValue}>{formatCurrency(stats.totalDiscount)}</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filters}>
                <Input
                    placeholder="Buscar por número o cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as POSSaleStatus | '')}
                    className={styles.select}
                >
                    <option value="">Todos los estados</option>
                    <option value={POSSaleStatus.COMPLETED}>Completadas</option>
                    <option value={POSSaleStatus.VOIDED}>Anuladas</option>
                    <option value={POSSaleStatus.PARTIALLY_REFUNDED}>Reembolso Parcial</option>
                    <option value={POSSaleStatus.FULLY_REFUNDED}>Reembolso Total</option>
                </select>
            </div>

            {/* Sales Table - Premium DataTable */}
            <DataTable 
                columns={columns} 
                data={filteredSales} 
            />

            {/* Sale Detail Modal */}
            {selectedSale && !showVoidModal && (
                <div className={styles.modalOverlay} onClick={() => setSelectedSale(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Venta {selectedSale.saleNumber}</h2>
                            <button className={styles.modalClose} onClick={() => setSelectedSale(null)}>
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailSection}>
                                <h3>Información General</h3>
                                <div className={styles.detailGrid}>
                                    <div>
                                        <span className={styles.detailLabel}>Fecha</span>
                                        <span>{formatDate(selectedSale.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className={styles.detailLabel}>Estado</span>
                                        {getStatusBadge(selectedSale.status)}
                                    </div>
                                    <div>
                                        <span className={styles.detailLabel}>Cliente</span>
                                        <span>{selectedSale.customerName}</span>
                                    </div>
                                    <div>
                                        <span className={styles.detailLabel}>NIT</span>
                                        <span>{selectedSale.customerNIT || 'C/F'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.detailLabel}>Vendedor</span>
                                        <span>{selectedSale.createdBy?.name || selectedSale.createdBy?.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Productos</h3>
                                <table className={styles.itemsTable}>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSale.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.partName}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatCurrency(item.unitPrice)}</td>
                                                <td>{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Totales</h3>
                                <div className={styles.totalsGrid}>
                                    <div>
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(selectedSale.subtotal)}</span>
                                    </div>
                                    {selectedSale.discountAmount > 0 && (
                                        <div>
                                            <span>Descuento</span>
                                            <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span>IVA ({selectedSale.taxRate}%)</span>
                                        <span>{formatCurrency(selectedSale.taxAmount)}</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span>Total</span>
                                        <span>{formatCurrency(selectedSale.total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Pagos</h3>
                                <div className={styles.paymentsList}>
                                    {selectedSale.payments.map((payment, idx) => (
                                        <div key={idx} className={styles.paymentRow}>
                                            <span>{getPaymentMethodLabel(payment.paymentMethod)}</span>
                                            <span>{formatCurrency(payment.amount)}</span>
                                        </div>
                                    ))}
                                    {selectedSale.changeGiven > 0 && (
                                        <div className={styles.changeRow}>
                                            <span>Cambio</span>
                                            <span>{formatCurrency(selectedSale.changeGiven)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSale.notes && (
                                <div className={styles.detailSection}>
                                    <h3>Notas</h3>
                                    <p className={styles.notes}>{selectedSale.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="outline" onClick={() => setSelectedSale(null)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {showVoidModal && selectedSale && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Anular Venta</h2>
                            <button className={styles.modalClose} onClick={() => {
                                setShowVoidModal(false);
                                setVoidReason('');
                            }}>
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.voidWarning}>
                                Está a punto de anular la venta <strong>{selectedSale.saleNumber}</strong>.
                                Esto restaurará el inventario y registrará un egreso en la caja si hubo pagos en efectivo.
                            </p>
                            <div className={styles.voidField}>
                                <label>Razón de anulación *</label>
                                <textarea
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    placeholder="Ingrese la razón..."
                                    className={styles.voidTextarea}
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowVoidModal(false);
                                    setVoidReason('');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleVoidSale}
                                isLoading={isVoiding}
                                disabled={isVoiding || !voidReason.trim()}
                            >
                                Anular Venta
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
