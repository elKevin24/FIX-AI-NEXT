'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import {
    QuotationListItem,
    createQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    duplicateQuotation,
    deleteQuotation,
    getQuotationById,
} from '@/lib/quotation-actions';
import { QuotationStatus, PaymentMethod } from '@/generated/prisma';
import styles from './quotations.module.css';

// Types
type Part = {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
};

type Customer = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
};

type CartItem = {
    partId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    availableStock: number;
};

type Payment = {
    method: PaymentMethod;
    amount: number;
    reference?: string;
};

type QuotationDetail = Awaited<ReturnType<typeof getQuotationById>>;

interface Props {
    initialQuotations: QuotationListItem[];
    stats: {
        totalQuotations: number;
        thisMonthQuotations: number;
        pendingQuotations: number;
        convertedThisMonth: number;
        expiredCount: number;
        conversionRate: number;
    };
    parts: Part[];
    customers: Customer[];
    taxRate: number;
}

export function QuotationsClient({
    initialQuotations,
    stats,
    parts,
    customers,
    taxRate,
}: Props) {
    const router = useRouter();
    const { addToast } = useToast();

    // State
    const [quotations] = useState(initialQuotations);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('');
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState<QuotationDetail | null>(null);

    // Create form state
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [validDays, setValidDays] = useState(15);
    const [notes, setNotes] = useState('');

    // Convert form state
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('CASH');

    // Filtered quotations
    const filteredQuotations = useMemo(() => {
        return quotations.filter((q) => {
            const matchesSearch =
                !searchTerm ||
                q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = !statusFilter || q.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [quotations, searchTerm, statusFilter]);

    // Product search results
    const productResults = useMemo(() => {
        if (!productSearch) return [];
        const term = productSearch.toLowerCase();
        return parts
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    p.sku.toLowerCase().includes(term)
            )
            .slice(0, 10);
    }, [parts, productSearch]);

    // Calculate totals
    const { subtotal, discountAmount, tax, total } = useMemo(() => {
        let sub = 0;
        cartItems.forEach((item) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            const itemDiscount = itemSubtotal * (item.discount / 100);
            sub += itemSubtotal - itemDiscount;
        });

        const disc = sub * (globalDiscount / 100);
        const discountedSub = sub - disc;
        const taxAmt = discountedSub * (taxRate / 100);
        const tot = discountedSub + taxAmt;

        return {
            subtotal: sub,
            discountAmount: disc,
            tax: taxAmt,
            total: tot,
        };
    }, [cartItems, globalDiscount, taxRate]);

    // Handlers
    const addToCart = (part: Part) => {
        const existing = cartItems.find((item) => item.partId === part.id);
        if (existing) {
            setCartItems((prev) =>
                prev.map((item) =>
                    item.partId === part.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setCartItems((prev) => [
                ...prev,
                {
                    partId: part.id,
                    name: part.name,
                    sku: part.sku,
                    quantity: 1,
                    unitPrice: part.price,
                    discount: 0,
                    availableStock: part.quantity,
                },
            ]);
        }
        setProductSearch('');
    };

    const updateCartItem = (
        partId: string,
        field: 'quantity' | 'unitPrice' | 'discount',
        value: number
    ) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.partId === partId ? { ...item, [field]: value } : item
            )
        );
    };

    const removeFromCart = (partId: string) => {
        setCartItems((prev) => prev.filter((item) => item.partId !== partId));
    };

    const resetForm = () => {
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCartItems([]);
        setProductSearch('');
        setGlobalDiscount(0);
        setValidDays(15);
        setNotes('');
    };

    const handleCreateQuotation = async () => {
        if (cartItems.length === 0) {
            addToast('Debe agregar al menos un producto', 'ERROR');
            return;
        }

        setLoading(true);
        try {
            const result = await createQuotation({
                customerId: selectedCustomerId || undefined,
                customerName: selectedCustomerId
                    ? undefined
                    : customerName || 'Consumidor Final',
                customerPhone: customerPhone || undefined,
                customerEmail: customerEmail || undefined,
                items: cartItems.map((item) => ({
                    partId: item.partId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                })),
                notes: notes || undefined,
                validDays,
                globalDiscount,
                taxRate,
            });

            if (result.success) {
                addToast('Cotización creada exitosamente', 'SUCCESS');
                setShowCreateModal(false);
                resetForm();
                router.refresh();
            }
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al crear cotización',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (quotation: QuotationListItem) => {
        setLoading(true);
        try {
            const detail = await getQuotationById(quotation.id);
            setSelectedQuotation(detail);
            setShowDetailModal(true);
        } catch (error) {
            addToast('Error al cargar cotización', 'ERROR');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (
        id: string,
        newStatus: QuotationStatus
    ) => {
        setLoading(true);
        try {
            await updateQuotationStatus(id, newStatus);
            addToast('Estado actualizado', 'SUCCESS');
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al actualizar estado',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (id: string) => {
        setLoading(true);
        try {
            await duplicateQuotation(id);
            addToast('Cotización duplicada', 'SUCCESS');
            router.refresh();
        } catch (error) {
            addToast('Error al duplicar', 'ERROR');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar esta cotización?')) return;

        setLoading(true);
        try {
            await deleteQuotation(id);
            addToast('Cotización eliminada', 'SUCCESS');
            setShowDetailModal(false);
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al eliminar',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const openConvertModal = (quotation: QuotationDetail) => {
        setSelectedQuotation(quotation);
        setPayments([{ method: 'CASH', amount: quotation.total }]);
        setShowDetailModal(false);
        setShowConvertModal(true);
    };

    const addPayment = () => {
        const remaining = selectedQuotation!.total - payments.reduce((s, p) => s + p.amount, 0);
        if (remaining > 0) {
            setPayments((prev) => [
                ...prev,
                { method: selectedPaymentMethod, amount: remaining },
            ]);
        }
    };

    const updatePayment = (index: number, field: 'amount' | 'reference', value: string | number) => {
        setPayments((prev) =>
            prev.map((p, i) =>
                i === index
                    ? { ...p, [field]: field === 'amount' ? Number(value) : value }
                    : p
            )
        );
    };

    const removePayment = (index: number) => {
        setPayments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleConvertToSale = async () => {
        if (!selectedQuotation) return;

        const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
        if (Math.abs(totalPayments - selectedQuotation.total) > 0.01) {
            addToast('El total de pagos no coincide con el total de la cotización', 'ERROR');
            return;
        }

        setLoading(true);
        try {
            await convertQuotationToSale({
                quotationId: selectedQuotation.id,
                payments: payments.map((p) => ({
                    method: p.method,
                    amount: p.amount,
                    reference: p.reference,
                })),
            });

            addToast('Cotización convertida a venta exitosamente', 'SUCCESS');
            setShowConvertModal(false);
            setSelectedQuotation(null);
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al convertir',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    // Status badge config
    const getStatusBadge = (status: QuotationStatus) => {
        const config: Record<
            QuotationStatus,
            { variant: 'success' | 'error' | 'warning' | 'info' | 'gray'; label: string }
        > = {
            DRAFT: { variant: 'gray', label: 'Borrador' },
            SENT: { variant: 'info', label: 'Enviada' },
            ACCEPTED: { variant: 'success', label: 'Aceptada' },
            REJECTED: { variant: 'error', label: 'Rechazada' },
            EXPIRED: { variant: 'warning', label: 'Expirada' },
            CONVERTED: { variant: 'success', label: 'Convertida' },
            CANCELLED: { variant: 'error', label: 'Cancelada' },
        };
        const { variant, label } = config[status];
        return <Badge variant={variant}>{label}</Badge>;
    };

    const formatCurrency = (amount: number) => `Q${amount.toFixed(2)}`;
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Cotizaciones</h1>
                    <p>Gestión de cotizaciones y propuestas</p>
                </div>
                <div className={styles.actions}>
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Nueva Cotización
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Cotizaciones</h3>
                    <div className={styles.value}>{stats.totalQuotations}</div>
                </div>
                <div className={`${styles.statCard} ${styles.warning}`}>
                    <h3>Pendientes</h3>
                    <div className={styles.value}>{stats.pendingQuotations}</div>
                </div>
                <div className={`${styles.statCard} ${styles.success}`}>
                    <h3>Convertidas (mes)</h3>
                    <div className={styles.value}>{stats.convertedThisMonth}</div>
                </div>
                <div className={`${styles.statCard} ${styles.info}`}>
                    <h3>Tasa Conversión</h3>
                    <div className={styles.value}>{stats.conversionRate}%</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filtersBar}>
                <input
                    type="text"
                    placeholder="Buscar por número o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | '')}
                    className={styles.filterSelect}
                >
                    <option value="">Todos los estados</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="SENT">Enviada</option>
                    <option value="ACCEPTED">Aceptada</option>
                    <option value="REJECTED">Rechazada</option>
                    <option value="EXPIRED">Expirada</option>
                    <option value="CONVERTED">Convertida</option>
                    <option value="CANCELLED">Cancelada</option>
                </select>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Cotización</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Válida Hasta</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQuotations.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className={styles.emptyState}>
                                        <h3>No hay cotizaciones</h3>
                                        <p>Crea una nueva cotización para comenzar</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredQuotations.map((q) => (
                                <tr key={q.id}>
                                    <td>
                                        <span className={styles.quotationNumber}>
                                            {q.quotationNumber}
                                        </span>
                                        <div className={styles.dateInfo}>
                                            <span className={styles.dateLabel}>
                                                {formatDate(q.createdAt)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.customerInfo}>
                                            <span className={styles.customerName}>
                                                {q.customer?.name || q.customerName}
                                            </span>
                                            {(q.customerEmail || q.customerPhone) && (
                                                <span className={styles.customerContact}>
                                                    {q.customerEmail || q.customerPhone}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.amount}>
                                        {formatCurrency(q.total)}
                                    </td>
                                    <td>{getStatusBadge(q.status)}</td>
                                    <td>
                                        <span
                                            className={
                                                new Date(q.validUntil) < new Date()
                                                    ? styles.dateExpired
                                                    : ''
                                            }
                                        >
                                            {formatDate(q.validUntil)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionsCell}>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => handleViewDetail(q)}
                                            >
                                                Ver
                                            </button>
                                            {q.status === 'DRAFT' && (
                                                <button
                                                    className={`${styles.actionBtn} ${styles.primary}`}
                                                    onClick={() =>
                                                        handleStatusChange(q.id, 'SENT')
                                                    }
                                                >
                                                    Enviar
                                                </button>
                                            )}
                                            {q.status === 'ACCEPTED' && (
                                                <button
                                                    className={`${styles.actionBtn} ${styles.success}`}
                                                    onClick={() => handleViewDetail(q)}
                                                >
                                                    Convertir
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Nueva Cotización</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowCreateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Customer Selection */}
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Cliente Registrado</label>
                                    <select
                                        value={selectedCustomerId}
                                        onChange={(e) => {
                                            setSelectedCustomerId(e.target.value);
                                            if (e.target.value) {
                                                const customer = customers.find(
                                                    (c) => c.id === e.target.value
                                                );
                                                if (customer) {
                                                    setCustomerName(customer.name);
                                                    setCustomerEmail(customer.email || '');
                                                    setCustomerPhone(customer.phone || '');
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">-- Consumidor Final --</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Consumidor Final"
                                        disabled={!!selectedCustomerId}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Teléfono</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Product Search */}
                            <div className={styles.productSearch}>
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o SKU..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className={styles.productSearchInput}
                                />
                                {productResults.length > 0 && (
                                    <div className={styles.productResults}>
                                        {productResults.map((part) => (
                                            <div
                                                key={part.id}
                                                className={styles.productResult}
                                                onClick={() => addToCart(part)}
                                            >
                                                <div className={styles.productResultInfo}>
                                                    <span className={styles.productResultName}>
                                                        {part.name}
                                                    </span>
                                                    <span className={styles.productResultSku}>
                                                        {part.sku} • Stock: {part.quantity}
                                                    </span>
                                                </div>
                                                <span className={styles.productResultPrice}>
                                                    {formatCurrency(part.price)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items Table */}
                            <div className={styles.itemsSection}>
                                <h3>Productos</h3>
                                <table className={styles.itemsTable}>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Desc. %</th>
                                            <th>Subtotal</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className={styles.noItems}>
                                                    Busca y agrega productos
                                                </td>
                                            </tr>
                                        ) : (
                                            cartItems.map((item: any) => {
                                                const itemSubtotal =
                                                    item.unitPrice * item.quantity;
                                                const itemDiscount =
                                                    itemSubtotal * (item.discount / 100);
                                                return (
                                                    <tr key={item.partId}>
                                                        <td>
                                                            <div>{item.name}</div>
                                                            <small>{item.sku}</small>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) =>
                                                                    updateCartItem(
                                                                        item.partId,
                                                                        'quantity',
                                                                        parseInt(e.target.value) ||
                                                                            1
                                                                    )
                                                                }
                                                                className={styles.itemInput}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.unitPrice}
                                                                onChange={(e) =>
                                                                    updateCartItem(
                                                                        item.partId,
                                                                        'unitPrice',
                                                                        parseFloat(
                                                                            e.target.value
                                                                        ) || 0
                                                                    )
                                                                }
                                                                className={styles.itemInput}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={item.discount}
                                                                onChange={(e) =>
                                                                    updateCartItem(
                                                                        item.partId,
                                                                        'discount',
                                                                        parseFloat(
                                                                            e.target.value
                                                                        ) || 0
                                                                    )
                                                                }
                                                                className={styles.itemInput}
                                                            />
                                                        </td>
                                                        <td>
                                                            {formatCurrency(
                                                                itemSubtotal - itemDiscount
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className={styles.removeItemBtn}
                                                                onClick={() =>
                                                                    removeFromCart(item.partId)
                                                                }
                                                            >
                                                                ×
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Options */}
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Descuento Global (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={globalDiscount}
                                        onChange={(e) =>
                                            setGlobalDiscount(parseFloat(e.target.value) || 0)
                                        }
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Válida por (días)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={validDays}
                                        onChange={(e) =>
                                            setValidDays(parseInt(e.target.value) || 15)
                                        }
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.full}`}>
                                    <label>Notas</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Totals */}
                            <div className={styles.totalsSection}>
                                <div className={styles.totalsBox}>
                                    <div className={styles.totalsRow}>
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className={styles.totalsRow}>
                                            <span>Descuento:</span>
                                            <span>-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className={styles.totalsRow}>
                                        <span>IVA ({taxRate}%):</span>
                                        <span>{formatCurrency(tax)}</span>
                                    </div>
                                    <div className={`${styles.totalsRow} ${styles.total}`}>
                                        <span>Total:</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button
                                variant="secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateQuotation} disabled={loading}>
                                {loading ? 'Guardando...' : 'Crear Cotización'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedQuotation && (
                <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Cotización {selectedQuotation.quotationNumber}</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailSection}>
                                    <h3>Cliente</h3>
                                    <div className={styles.detailRow}>
                                        <label>Nombre:</label>
                                        <span>
                                            {selectedQuotation.customer?.name ||
                                                selectedQuotation.customerName}
                                        </span>
                                    </div>
                                    {selectedQuotation.customerEmail && (
                                        <div className={styles.detailRow}>
                                            <label>Email:</label>
                                            <span>{selectedQuotation.customerEmail}</span>
                                        </div>
                                    )}
                                    {selectedQuotation.customerPhone && (
                                        <div className={styles.detailRow}>
                                            <label>Teléfono:</label>
                                            <span>{selectedQuotation.customerPhone}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.detailSection}>
                                    <h3>Información</h3>
                                    <div className={styles.detailRow}>
                                        <label>Estado:</label>
                                        <span>
                                            {getStatusBadge(selectedQuotation.status)}
                                        </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Creada:</label>
                                        <span>{formatDate(selectedQuotation.createdAt)}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Válida hasta:</label>
                                        <span>{formatDate(selectedQuotation.validUntil)}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Creada por:</label>
                                        <span>{selectedQuotation.createdBy?.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div className={styles.itemsSection}>
                                <h3>Productos</h3>
                                <table className={styles.itemsTable}>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Desc.</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedQuotation.items.map((item: any) => {
                                            const itemSubtotal =
                                                item.unitPrice * item.quantity;
                                            const itemDiscount =
                                                itemSubtotal * (item.discount / 100);
                                            return (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div>{item.part.name}</div>
                                                        <small>{item.part.sku}</small>
                                                    </td>
                                                    <td>{item.quantity}</td>
                                                    <td>{formatCurrency(item.unitPrice)}</td>
                                                    <td>{item.discount}%</td>
                                                    <td>
                                                        {formatCurrency(
                                                            itemSubtotal - itemDiscount
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className={styles.totalsSection}>
                                <div className={styles.totalsBox}>
                                    <div className={styles.totalsRow}>
                                        <span>Subtotal:</span>
                                        <span>
                                            {formatCurrency(selectedQuotation.subtotal)}
                                        </span>
                                    </div>
                                    {selectedQuotation.discountAmount > 0 && (
                                        <div className={styles.totalsRow}>
                                            <span>Descuento:</span>
                                            <span>
                                                -
                                                {formatCurrency(
                                                    selectedQuotation.discountAmount
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className={styles.totalsRow}>
                                        <span>IVA ({selectedQuotation.taxRate}%):</span>
                                        <span>
                                            {formatCurrency(selectedQuotation.taxAmount)}
                                        </span>
                                    </div>
                                    <div className={`${styles.totalsRow} ${styles.total}`}>
                                        <span>Total:</span>
                                        <span>
                                            {formatCurrency(selectedQuotation.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedQuotation.notes && (
                                <div className={styles.detailSection}>
                                    <h3>Notas</h3>
                                    <p>{selectedQuotation.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            {selectedQuotation.status === 'DRAFT' && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleDelete(selectedQuotation.id)}
                                        disabled={loading}
                                    >
                                        Eliminar
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            handleStatusChange(selectedQuotation.id, 'SENT')
                                        }
                                        disabled={loading}
                                    >
                                        Marcar como Enviada
                                    </Button>
                                </>
                            )}
                            {selectedQuotation.status === 'SENT' && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            handleStatusChange(
                                                selectedQuotation.id,
                                                'REJECTED'
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        Rechazada
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            handleStatusChange(
                                                selectedQuotation.id,
                                                'ACCEPTED'
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        Aceptada
                                    </Button>
                                </>
                            )}
                            {selectedQuotation.status === 'ACCEPTED' && (
                                <Button
                                    onClick={() => openConvertModal(selectedQuotation)}
                                    disabled={loading}
                                >
                                    Convertir a Venta
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() => handleDuplicate(selectedQuotation.id)}
                                disabled={loading}
                            >
                                Duplicar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Convert to Sale Modal */}
            {showConvertModal && selectedQuotation && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setShowConvertModal(false)}
                >
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Convertir a Venta</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowConvertModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailSection}>
                                <h3>Cotización</h3>
                                <div className={styles.detailRow}>
                                    <label>Número:</label>
                                    <span>{selectedQuotation.quotationNumber}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <label>Cliente:</label>
                                    <span>
                                        {selectedQuotation.customer?.name ||
                                            selectedQuotation.customerName}
                                    </span>
                                </div>
                                <div className={styles.detailRow}>
                                    <label>Total:</label>
                                    <span style={{ fontWeight: 700 }}>
                                        {formatCurrency(selectedQuotation.total)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.paymentSection}>
                                <h3>Métodos de Pago</h3>
                                <div className={styles.paymentMethods}>
                                    {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map(
                                        (method) => (
                                            <button
                                                key={method}
                                                className={`${styles.paymentMethodBtn} ${
                                                    selectedPaymentMethod === method
                                                        ? styles.active
                                                        : ''
                                                }`}
                                                onClick={() => setSelectedPaymentMethod(method)}
                                            >
                                                {method === 'CASH'
                                                    ? 'Efectivo'
                                                    : method === 'CARD'
                                                    ? 'Tarjeta'
                                                    : 'Transferencia'}
                                            </button>
                                        )
                                    )}
                                    <Button variant="secondary" onClick={addPayment}>
                                        + Agregar
                                    </Button>
                                </div>

                                <div className={styles.paymentsList}>
                                    {payments.map((payment: any, index: number) => (
                                        <div key={index} className={styles.paymentRow}>
                                            <span className={styles.method}>
                                                {payment.method === 'CASH'
                                                    ? 'Efectivo'
                                                    : payment.method === 'CARD'
                                                    ? 'Tarjeta'
                                                    : 'Transferencia'}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={payment.amount}
                                                onChange={(e) =>
                                                    updatePayment(
                                                        index,
                                                        'amount',
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Monto"
                                            />
                                            {payment.method !== 'CASH' && (
                                                <input
                                                    type="text"
                                                    value={payment.reference || ''}
                                                    onChange={(e) =>
                                                        updatePayment(
                                                            index,
                                                            'reference',
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Referencia"
                                                />
                                            )}
                                            <button
                                                className={styles.removePaymentBtn}
                                                onClick={() => removePayment(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.paymentSummary}>
                                    <span>Total a pagar:</span>
                                    <span>{formatCurrency(selectedQuotation.total)}</span>
                                </div>
                                <div className={styles.paymentSummary}>
                                    <span>Total pagos:</span>
                                    <span>
                                        {formatCurrency(
                                            payments.reduce((s, p) => s + p.amount, 0)
                                        )}
                                    </span>
                                </div>
                                <div className={styles.paymentSummary}>
                                    <span>Restante:</span>
                                    <span
                                        className={`${styles.remaining} ${
                                            selectedQuotation.total -
                                                payments.reduce((s, p) => s + p.amount, 0) >
                                            0.01
                                                ? styles.error
                                                : styles.success
                                        }`}
                                    >
                                        {formatCurrency(
                                            selectedQuotation.total -
                                                payments.reduce((s, p) => s + p.amount, 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button
                                variant="secondary"
                                onClick={() => setShowConvertModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleConvertToSale} disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar Venta'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}