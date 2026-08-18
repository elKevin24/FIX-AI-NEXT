'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
import { QuotationStatus, PaymentMethod } from '@prisma/client';
import styles from './quotations.module.css';
import PageHeader from '@/components/PageHeader';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

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
    const [liveMessage, setLiveMessage] = useState('');

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

    // Helpers
    const formatCurrency = (amount: number) => `Q${amount.toFixed(2)}`;
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    const announce = (msg: string) => {
        setLiveMessage('');
        requestAnimationFrame(() => setLiveMessage(msg));
    };

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
        announce(`${part.name} agregado al carrito`);
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
        announce('Producto eliminado del carrito');
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
                announce('Cotización creada exitosamente');
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
            announce('Estado actualizado');
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
            announce('Cotización duplicada');
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
            announce('Cotización eliminada');
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
        announce('Pago eliminado');
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
            announce('Cotización convertida a venta exitosamente');
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al convertir',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    // Status badge
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

    // Payment method label
    const getPaymentLabel = (method: PaymentMethod) => {
        const labels: Record<PaymentMethod, string> = {
            CASH: 'Efectivo',
            CARD: 'Tarjeta',
            TRANSFER: 'Transferencia',
            CHECK: 'Cheque',
            OTHER: 'Otro',
        };
        return labels[method];
    };

    // Remaining calculation for convert modal
    const remainingAmount = selectedQuotation
        ? selectedQuotation.total - payments.reduce((s, p) => s + p.amount, 0)
        : 0;
    const isRemainingPositive = remainingAmount > 0.01;

    return (
        <div className={styles['container']}>
            {/* Aria live region for async feedback */}
            <div className={styles['srOnly']} aria-live="polite" aria-atomic="true">
                {liveMessage}
            </div>

            {/* Header */}
            <PageHeader
                title="Cotizaciones"
                subtitle="Gestión de cotizaciones y propuestas"
                actions={
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Nueva Cotización
                    </Button>
                }
            />

            {/* Stats */}
            <div className={styles['statsGrid']}>
                <div className={styles['statCard']}>
                    <h3>Total Cotizaciones</h3>
                    <div className={styles['value']}>{stats.totalQuotations}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['warning']}`}>
                    <h3>Pendientes</h3>
                    <div className={styles['value']}>{stats.pendingQuotations}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['success']}`}>
                    <h3>Convertidas (mes)</h3>
                    <div className={styles['value']}>{stats.convertedThisMonth}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['info']}`}>
                    <h3>Tasa Conversión</h3>
                    <div className={styles['value']}>{stats.conversionRate}%</div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles['filtersBar']}>
                <input
                    type="text"
                    placeholder="Buscar por número o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles['searchInput']}
                    aria-label="Buscar cotización por número o cliente"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | '')}
                    className={styles['filterSelect']}
                    aria-label="Filtrar por estado"
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
            <div className={styles['tableContainer']}>
                <div className={styles['tableWrapper']}>
                    <table className={styles['table']}>
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
                                        <div className={styles['emptyState']}>
                                            <h3>No hay cotizaciones</h3>
                                            <p>Crea una nueva cotización para comenzar</p>
                                            <Button onClick={() => setShowCreateModal(true)}>
                                                + Nueva Cotización
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotations.map((q) => (
                                    <tr key={q.id}>
                                        <td>
                                            <span className={styles['quotationNumber']}>
                                                {q.quotationNumber}
                                            </span>
                                            <div className={styles['dateInfo']}>
                                                <span className={styles['dateLabel']}>
                                                    {formatDate(q.createdAt)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles['customerInfo']}>
                                                <span className={styles['customerName']}>
                                                    {q.customer?.name || q.customerName}
                                                </span>
                                                {(q.customerEmail || q.customerPhone) && (
                                                    <span className={styles['customerContact']}>
                                                        {q.customerEmail || q.customerPhone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles['amount']}>
                                            {formatCurrency(q.total)}
                                        </td>
                                        <td>{getStatusBadge(q.status)}</td>
                                        <td>
                                            <span
                                                className={
                                                    new Date(q.validUntil) < new Date()
                                                        ? styles['dateExpired']
                                                        : ''
                                                }
                                            >
                                                {formatDate(q.validUntil)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles['actionsCell']}>
                                                <button
                                                    className={styles['actionBtn']}
                                                    onClick={() => handleViewDetail(q)}
                                                    aria-label={`Ver cotización ${q.quotationNumber}`}
                                                >
                                                    Ver
                                                </button>
                                                {q.status === 'DRAFT' && (
                                                    <button
                                                        className={`${styles['actionBtn']} ${styles['primary']}`}
                                                        onClick={() =>
                                                            handleStatusChange(q.id, 'SENT')
                                                        }
                                                        aria-label={`Enviar cotización ${q.quotationNumber}`}
                                                    >
                                                        Enviar
                                                    </button>
                                                )}
                                                {q.status === 'ACCEPTED' && (
                                                    <button
                                                        className={`${styles['actionBtn']} ${styles['success']}`}
                                                        onClick={() => handleViewDetail(q)}
                                                        aria-label={`Convertir cotización ${q.quotationNumber} a venta`}
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
            </div>

            {/* ===== CREATE MODAL ===== */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Nueva Cotización"
                size="xl"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setShowCreateModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateQuotation}
                            disabled={loading}
                            isLoading={loading}
                        >
                            Crear Cotización
                        </Button>
                    </>
                }
            >
                {/* Customer Selection */}
                <div className={styles['formGrid']}>
                    <div className={styles['formGroup']}>
                        <label htmlFor="customerSelect">Cliente Registrado</label>
                        <select
                            id="customerSelect"
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
                    <div className={styles['formGroup']}>
                        <label htmlFor="customerNameInput">Nombre</label>
                        <input
                            id="customerNameInput"
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Consumidor Final"
                            disabled={!!selectedCustomerId}
                        />
                    </div>
                    <div className={styles['formGroup']}>
                        <label htmlFor="customerPhoneInput">Teléfono</label>
                        <input
                            id="customerPhoneInput"
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                    </div>
                    <div className={styles['formGroup']}>
                        <label htmlFor="customerEmailInput">Email</label>
                        <input
                            id="customerEmailInput"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                    </div>
                </div>

                {/* Product Search */}
                <div className={styles['productSearch']}>
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o SKU..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className={styles['productSearchInput']}
                        aria-label="Buscar producto por nombre o SKU"
                    />
                    {productResults.length > 0 && (
                        <div className={styles['productResults']}>
                            {productResults.map((part) => (
                                <button
                                    key={part.id}
                                    type="button"
                                    className={styles['productResult']}
                                    onClick={() => addToCart(part)}
                                    aria-label={`${part.name}, ${formatCurrency(part.price)}, Stock: ${part.quantity}`}
                                >
                                    <div className={styles['productResultInfo']}>
                                        <span className={styles['productResultName']}>
                                            {part.name}
                                        </span>
                                        <span className={styles['productResultSku']}>
                                            {part.sku} • Stock: {part.quantity}
                                        </span>
                                    </div>
                                    <span className={styles['productResultPrice']}>
                                        {formatCurrency(part.price)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Items Table */}
                <div className={styles['itemsSection']}>
                    <h3>Productos</h3>
                    <table className={styles['itemsTable']}>
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
                                    <td colSpan={6} className={styles['noItems']}>
                                        Busca y agrega productos
                                    </td>
                                </tr>
                            ) : (
                                cartItems.map((item: any) => {
                                    const itemSubtotal = item.unitPrice * item.quantity;
                                    const itemDiscount = itemSubtotal * (item.discount / 100);
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
                                                            parseInt(e.target.value) || 1
                                                        )
                                                    }
                                                    className={styles['itemInput']}
                                                    aria-label={`Cantidad de ${item.name}`}
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
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    className={styles['itemInput']}
                                                    aria-label={`Precio unitario de ${item.name}`}
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
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    className={styles['itemInput']}
                                                    aria-label={`Descuento de ${item.name} en porcentaje`}
                                                />
                                            </td>
                                            <td>
                                                {formatCurrency(itemSubtotal - itemDiscount)}
                                            </td>
                                            <td>
                                                <button
                                                    className={styles['removeItemBtn']}
                                                    onClick={() => removeFromCart(item.partId)}
                                                    aria-label={`Eliminar ${item.name} del carrito`}
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
                <div className={styles['formGrid']}>
                    <div className={styles['formGroup']}>
                        <label htmlFor="globalDiscountInput">Descuento Global (%)</label>
                        <input
                            id="globalDiscountInput"
                            type="number"
                            min="0"
                            max="100"
                            value={globalDiscount}
                            onChange={(e) =>
                                setGlobalDiscount(parseFloat(e.target.value) || 0)
                            }
                        />
                    </div>
                    <div className={styles['formGroup']}>
                        <label htmlFor="validDaysInput">Válida por (días)</label>
                        <input
                            id="validDaysInput"
                            type="number"
                            min="1"
                            value={validDays}
                            onChange={(e) =>
                                setValidDays(parseInt(e.target.value) || 15)
                            }
                        />
                    </div>
                    <div className={`${styles['formGroup']} ${styles['full']}`}>
                        <label htmlFor="notesInput">Notas</label>
                        <textarea
                            id="notesInput"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                {/* Totals */}
                <div className={styles['totalsSection']}>
                    <div className={styles['totalsBox']} role="region" aria-label="Resumen de totales">
                        <div className={styles['totalsRow']}>
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className={styles['totalsRow']}>
                                <span>Descuento:</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div className={styles['totalsRow']}>
                            <span>IVA ({taxRate}%):</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className={`${styles['totalsRow']} ${styles['total']}`}>
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ===== DETAIL MODAL ===== */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={selectedQuotation ? `Cotización ${selectedQuotation.quotationNumber}` : ''}
                size="xl"
                footer={
                    <>
                        {selectedQuotation?.status === 'DRAFT' && (
                            <>
                                <Button
                                    variant="danger"
                                    onClick={() => handleDelete(selectedQuotation.id)}
                                    disabled={loading}
                                    isLoading={loading}
                                >
                                    Eliminar
                                </Button>
                                <Button
                                    onClick={() =>
                                        handleStatusChange(selectedQuotation.id, 'SENT')
                                    }
                                    disabled={loading}
                                    isLoading={loading}
                                >
                                    Marcar como Enviada
                                </Button>
                            </>
                        )}
                        {selectedQuotation?.status === 'SENT' && (
                            <>
                                <Button
                                    variant="danger"
                                    onClick={() =>
                                        handleStatusChange(selectedQuotation.id, 'REJECTED')
                                    }
                                    disabled={loading}
                                    isLoading={loading}
                                >
                                    Rechazada
                                </Button>
                                <Button
                                    onClick={() =>
                                        handleStatusChange(selectedQuotation.id, 'ACCEPTED')
                                    }
                                    disabled={loading}
                                    isLoading={loading}
                                >
                                    Aceptada
                                </Button>
                            </>
                        )}
                        {selectedQuotation?.status === 'ACCEPTED' && (
                            <Button
                                onClick={() => openConvertModal(selectedQuotation)}
                                disabled={loading}
                            >
                                Convertir a Venta
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => handleDuplicate(selectedQuotation!.id)}
                            disabled={loading}
                        >
                            Duplicar
                        </Button>
                    </>
                }
            >
                {selectedQuotation && (
                    <>
                        <div className={styles['detailGrid']}>
                            <div className={styles['detailSection']}>
                                <h3>Cliente</h3>
                                <div className={styles['detailRow']}>
                                    <span>Nombre:</span>
                                    <span>
                                        {selectedQuotation.customer?.name ||
                                            selectedQuotation.customerName}
                                    </span>
                                </div>
                                {selectedQuotation.customerEmail && (
                                    <div className={styles['detailRow']}>
                                        <span>Email:</span>
                                        <span>{selectedQuotation.customerEmail}</span>
                                    </div>
                                )}
                                {selectedQuotation.customerPhone && (
                                    <div className={styles['detailRow']}>
                                        <span>Teléfono:</span>
                                        <span>{selectedQuotation.customerPhone}</span>
                                    </div>
                                )}
                            </div>
                            <div className={styles['detailSection']}>
                                <h3>Información</h3>
                                <div className={styles['detailRow']}>
                                    <span>Estado:</span>
                                    <span>{getStatusBadge(selectedQuotation.status)}</span>
                                </div>
                                <div className={styles['detailRow']}>
                                    <span>Creada:</span>
                                    <span>{formatDate(selectedQuotation.createdAt)}</span>
                                </div>
                                <div className={styles['detailRow']}>
                                    <span>Válida hasta:</span>
                                    <span>
                                        {selectedQuotation.validUntil
                                            ? formatDate(selectedQuotation.validUntil)
                                            : 'N/A'}
                                    </span>
                                </div>
                                <div className={styles['detailRow']}>
                                    <span>Creada por:</span>
                                    <span>{selectedQuotation.createdBy?.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div className={styles['itemsSection']}>
                            <h3>Productos</h3>
                            <table className={styles['itemsTable']}>
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
                                        const itemSubtotal = item.unitPrice * item.quantity;
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
                        <div className={styles['totalsSection']}>
                            <div className={styles['totalsBox']} role="region" aria-label="Resumen de totales">
                                <div className={styles['totalsRow']}>
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(selectedQuotation.subtotal)}</span>
                                </div>
                                {selectedQuotation.discountAmount > 0 && (
                                    <div className={styles['totalsRow']}>
                                        <span>Descuento:</span>
                                        <span>
                                            -{formatCurrency(selectedQuotation.discountAmount)}
                                        </span>
                                    </div>
                                )}
                                <div className={styles['totalsRow']}>
                                    <span>IVA ({selectedQuotation.taxRate}%):</span>
                                    <span>{formatCurrency(selectedQuotation.taxAmount)}</span>
                                </div>
                                <div
                                    className={`${styles['totalsRow']} ${styles['total']}`}
                                >
                                    <span>Total:</span>
                                    <span>{formatCurrency(selectedQuotation.total)}</span>
                                </div>
                            </div>
                        </div>

                        {selectedQuotation.notes && (
                            <div className={styles['detailSection']}>
                                <h3>Notas</h3>
                                <p>{selectedQuotation.notes}</p>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* ===== CONVERT TO SALE MODAL ===== */}
            <Modal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                title="Convertir a Venta"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setShowConvertModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConvertToSale}
                            disabled={loading || isRemainingPositive}
                            isLoading={loading}
                        >
                            {loading ? 'Procesando...' : 'Confirmar Venta'}
                        </Button>
                    </>
                }
            >
                {selectedQuotation && (
                    <>
                        <div className={styles['detailSection']}>
                            <h3>Cotización</h3>
                            <div className={styles['detailRow']}>
                                <span>Número:</span>
                                <span>{selectedQuotation.quotationNumber}</span>
                            </div>
                            <div className={styles['detailRow']}>
                                <span>Cliente:</span>
                                <span>
                                    {selectedQuotation.customer?.name ||
                                        selectedQuotation.customerName}
                                </span>
                            </div>
                            <div className={styles['detailRow']}>
                                <span>Total:</span>
                                <span className={styles['amount']}>
                                    {formatCurrency(selectedQuotation.total)}
                                </span>
                            </div>
                        </div>

                        <div className={styles['paymentSection']}>
                            <h3>Métodos de Pago</h3>
                            <div className={styles['paymentMethods']}>
                                {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map(
                                    (method) => (
                                        <button
                                            key={method}
                                            className={`${styles['paymentMethodBtn']} ${
                                                selectedPaymentMethod === method
                                                    ? styles['active']
                                                    : ''
                                            }`}
                                            onClick={() => setSelectedPaymentMethod(method)}
                                            aria-pressed={selectedPaymentMethod === method}
                                            aria-label={`Seleccionar método: ${getPaymentLabel(method)}`}
                                        >
                                            {getPaymentLabel(method)}
                                        </button>
                                    )
                                )}
                                <Button variant="secondary" onClick={addPayment} size="sm">
                                    + Agregar
                                </Button>
                            </div>

                            <div className={styles['paymentsList']}>
                                {payments.map((payment: any, index: number) => (
                                    <div key={index} className={styles['paymentRow']}>
                                        <span className={styles['method']}>
                                            {getPaymentLabel(payment.method)}
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={payment.amount}
                                            onChange={(e) =>
                                                updatePayment(index, 'amount', e.target.value)
                                            }
                                            placeholder="Monto"
                                            aria-label={`Monto del pago ${index + 1}`}
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
                                                aria-label={`Referencia del pago ${index + 1}`}
                                            />
                                        )}
                                        <button
                                            className={styles['removePaymentBtn']}
                                            onClick={() => removePayment(index)}
                                            aria-label={`Eliminar pago ${index + 1}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className={styles['paymentSummary']} role="region" aria-label="Resumen de pagos">
                                <span>Total a pagar:</span>
                                <span>{formatCurrency(selectedQuotation.total)}</span>
                            </div>
                            <div className={styles['paymentSummary']}>
                                <span>Total pagos:</span>
                                <span>
                                    {formatCurrency(
                                        payments.reduce((s, p) => s + p.amount, 0)
                                    )}
                                </span>
                            </div>
                            <div className={styles['paymentSummary']}>
                                <span>
                                    {isRemainingPositive ? 'Pendiente:' : 'Pago completo:'}
                                </span>
                                <span
                                    className={`${styles['remaining']} ${
                                        isRemainingPositive
                                            ? styles['error']
                                            : styles['success']
                                    }`}
                                >
                                    {formatCurrency(remainingAmount)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
