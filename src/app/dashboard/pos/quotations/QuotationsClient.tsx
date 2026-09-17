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
import { QuotationStatus, PaymentMethod } from '@prisma/client';
import styles from './quotations.module.css';
import PageHeader from '@/components/PageHeader';
import { Part, Customer, CartItem, Payment, QuotationDetail, QuotationsProps } from './types';
import { QuotationCreateModal } from './components/QuotationCreateModal';
import { QuotationDetailModal } from './components/QuotationDetailModal';
import { QuotationConvertModal } from './components/QuotationConvertModal';

export function QuotationsClient({
    initialQuotations,
    stats,
    parts,
    customers,
    taxRate,
}: QuotationsProps) {
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
        } catch {
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
                    <h2>Total Cotizaciones</h2>
                    <div className={styles['value']}>{stats.totalQuotations}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['warning']}`}>
                    <h2>Pendientes</h2>
                    <div className={styles['value']}>{stats.pendingQuotations}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['success']}`}>
                    <h2>Convertidas (mes)</h2>
                    <div className={styles['value']}>{stats.convertedThisMonth}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['info']}`}>
                    <h2>Tasa Conversión</h2>
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
                      <caption className="sr-only">Listado de cotizaciones</caption>
                        <thead>
                            <tr>
                                <th scope="col">Cotización</th>
                                <th scope="col">Cliente</th>
                                <th scope="col">Total</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Válida Hasta</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuotations.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className={styles['emptyState']}>
                                            <h2>No hay cotizaciones</h2>
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

            {/* Sub-modals */}
            <QuotationCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                customers={customers}
                parts={parts}
                selectedCustomerId={selectedCustomerId}
                setSelectedCustomerId={setSelectedCustomerId}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                cartItems={cartItems}
                addToCart={addToCart}
                updateCartItem={updateCartItem}
                removeFromCart={removeFromCart}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                productResults={productResults}
                globalDiscount={globalDiscount}
                setGlobalDiscount={setGlobalDiscount}
                validDays={validDays}
                setValidDays={setValidDays}
                notes={notes}
                setNotes={setNotes}
                subtotal={subtotal}
                discountAmount={discountAmount}
                tax={tax}
                total={total}
                taxRate={taxRate}
                loading={loading}
                onCreateQuotation={handleCreateQuotation}
                formatCurrency={formatCurrency}
            />

            <QuotationDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                selectedQuotation={selectedQuotation}
                loading={loading}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onDuplicate={handleDuplicate}
                onOpenConvert={openConvertModal}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

            <QuotationConvertModal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                selectedQuotation={selectedQuotation}
                loading={loading}
                payments={payments}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
                addPayment={addPayment}
                updatePayment={updatePayment}
                removePayment={removePayment}
                onConvertToSale={handleConvertToSale}
                formatCurrency={formatCurrency}
                getPaymentLabel={getPaymentLabel}
            />
        </div>
    );
}
