'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethod } from '@prisma/client';
import { createPOSSale, getPartsForPOS } from '@/lib/pos-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import styles from './pos.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface Part {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    price: number;
    category: string | null;
}

interface Customer {
    id: string;
    name: string;
    nit: string | null;
    phone: string | null;
}

interface CartItem {
    partId: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    maxQuantity: number;
}

interface PaymentItem {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
}

interface POSClientProps {
    initialParts: Part[];
    initialCustomers: Customer[];
    taxRate: number;
    currency: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function POSClient({
    initialParts,
    initialCustomers,
    taxRate,
    currency,
}: POSClientProps) {
    const router = useRouter();

    // State
    const [parts, setParts] = useState<Part[]>(initialParts);
    const [customers] = useState<Customer[]>(initialCustomers);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchProduct, setSearchProduct] = useState('');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerName, setCustomerName] = useState('Consumidor Final');
    const [customerNIT, setCustomerNIT] = useState('C/F');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [notes, setNotes] = useState('');
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Filtered parts
    const filteredParts = useMemo(() => {
        if (!searchProduct.trim()) return parts;
        const search = searchProduct.toLowerCase();
        return parts.filter(
            p => p.name.toLowerCase().includes(search) ||
                (p.sku && p.sku.toLowerCase().includes(search))
        );
    }, [parts, searchProduct]);

    // Filtered customers
    const filteredCustomers = useMemo(() => {
        if (!searchCustomer.trim()) return customers.slice(0, 5);
        const search = searchCustomer.toLowerCase();
        return customers.filter(
            c => c.name.toLowerCase().includes(search) ||
                (c.nit && c.nit.toLowerCase().includes(search))
        );
    }, [customers, searchCustomer]);

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = discountType === 'percent'
        ? (subtotal * discount) / 100
        : discount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = total - totalPaid;
    const change = totalPaid > total ? totalPaid - total : 0;

    // Format currency
    const formatCurrency = (amount: number) => {
        return `Q${amount.toFixed(2)}`;
    };

    // Add to cart
    const addToCart = (part: Part) => {
        setError(null);
        const existing = cart.find(item => item.partId === part.id);

        if (existing) {
            if (existing.quantity >= part.quantity) {
                setError(`Stock máximo alcanzado para "${part.name}"`);
                return;
            }
            setCart(cart.map(item =>
                item.partId === part.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                partId: part.id,
                name: part.name,
                sku: part.sku,
                quantity: 1,
                unitPrice: part.price,
                maxQuantity: part.quantity,
            }]);
        }
    };

    // Update quantity
    const updateQuantity = (partId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(partId);
            return;
        }

        const item = cart.find(i => i.partId === partId);
        if (item && quantity > item.maxQuantity) {
            setError(`Stock máximo: ${item.maxQuantity}`);
            return;
        }

        setCart(cart.map(item =>
            item.partId === partId ? { ...item, quantity } : item
        ));
    };

    // Remove from cart
    const removeFromCart = (partId: string) => {
        setCart(cart.filter(item => item.partId !== partId));
    };

    // Clear cart
    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(null);
        setCustomerName('Consumidor Final');
        setCustomerNIT('C/F');
        setDiscount(0);
        setNotes('');
        setPayments([]);
        setError(null);
        setSuccess(null);
    };

    // Select customer
    const selectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerName(customer.name);
        setCustomerNIT(customer.nit || 'C/F');
        setSearchCustomer('');
    };

    // Add payment
    const addPayment = (method: PaymentMethod, amount: number, ref?: string) => {
        const newPayment: PaymentItem = {
            id: crypto.randomUUID(),
            amount,
            paymentMethod: method,
            transactionRef: ref,
        };
        setPayments([...payments, newPayment]);
    };

    // Remove payment
    const removePayment = (id: string) => {
        setPayments(payments.filter(p => p.id !== id));
    };

    // Process sale
    const processSale = async () => {
        if (cart.length === 0) {
            setError('Agregue productos al carrito');
            return;
        }

        if (totalPaid < total) {
            setError(`Faltan Q${remaining.toFixed(2)} por pagar`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createPOSSale({
                items: cart.map(item => ({
                    partId: item.partId,
                    quantity: item.quantity,
                })),
                payments: payments.map(p => ({
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    transactionRef: p.transactionRef,
                })),
                customerId: selectedCustomer?.id,
                customerName,
                customerNIT,
                discountAmount,
                notes: notes || undefined,
            });

            setSuccess(`Venta ${result.saleNumber} completada exitosamente`);
            setShowPaymentModal(false);

            // Refresh parts list
            const updatedParts = await getPartsForPOS();
            setParts(updatedParts);

            // Clear cart after short delay
            setTimeout(() => {
                clearCart();
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar la venta');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <h1>Punto de Venta</h1>
                <div className={styles.headerActions}>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/pos/history')}
                    >
                        Historial
                    </Button>
                </div>
            </header>

            {error && <Alert variant="error" className={styles.alert}>{error}</Alert>}
            {success && <Alert variant="success" className={styles.alert}>{success}</Alert>}

            <div className={styles.posLayout}>
                {/* Products Grid */}
                <div className={styles.productsSection}>
                    <div className={styles.searchBar}>
                        <Input
                            placeholder="Buscar producto por nombre o SKU..."
                            value={searchProduct}
                            onChange={(e) => setSearchProduct(e.target.value)}
                        />
                    </div>

                    <div className={styles.productsGrid}>
                        {filteredParts.length === 0 ? (
                            <div className={styles.emptyProducts}>
                                <p>No se encontraron productos</p>
                            </div>
                        ) : (
                            filteredParts.map(part => (
                                <button
                                    key={part.id}
                                    className={styles.productCard}
                                    onClick={() => addToCart(part)}
                                    disabled={part.quantity <= 0}
                                >
                                    <div className={styles.productName}>{part.name}</div>
                                    {part.sku && (
                                        <div className={styles.productSku}>{part.sku}</div>
                                    )}
                                    <div className={styles.productPrice}>
                                        {formatCurrency(part.price)}
                                    </div>
                                    <div className={styles.productStock}>
                                        Stock: {part.quantity}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Cart Section */}
                <div className={styles.cartSection}>
                    {/* Customer Selector */}
                    <div className={styles.customerSection}>
                        <label className={styles.label}>Cliente</label>
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchCustomer}
                            onChange={(e) => setSearchCustomer(e.target.value)}
                        />
                        {searchCustomer && filteredCustomers.length > 0 && (
                            <div className={styles.customerDropdown}>
                                {filteredCustomers.map(customer => (
                                    <button
                                        key={customer.id}
                                        className={styles.customerOption}
                                        onClick={() => selectCustomer(customer)}
                                    >
                                        <span>{customer.name}</span>
                                        {customer.nit && <span className={styles.customerNit}>{customer.nit}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedCustomer && (
                            <div className={styles.selectedCustomer}>
                                <span>{customerName}</span>
                                <span>NIT: {customerNIT}</span>
                                <button onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomerName('Consumidor Final');
                                    setCustomerNIT('C/F');
                                }}>
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className={styles.cartItems}>
                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}>
                                <p>Carrito vacío</p>
                                <p className={styles.emptyCartHint}>
                                    Haz clic en los productos para agregarlos
                                </p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.partId} className={styles.cartItem}>
                                    <div className={styles.cartItemInfo}>
                                        <span className={styles.cartItemName}>{item.name}</span>
                                        <span className={styles.cartItemPrice}>
                                            {formatCurrency(item.unitPrice)}
                                        </span>
                                    </div>
                                    <div className={styles.cartItemActions}>
                                        <button
                                            className={styles.qtyBtn}
                                            onClick={() => updateQuantity(item.partId, item.quantity - 1)}
                                        >
                                            -
                                        </button>
                                        <span className={styles.qtyValue}>{item.quantity}</span>
                                        <button
                                            className={styles.qtyBtn}
                                            onClick={() => updateQuantity(item.partId, item.quantity + 1)}
                                        >
                                            +
                                        </button>
                                        <span className={styles.cartItemTotal}>
                                            {formatCurrency(item.unitPrice * item.quantity)}
                                        </span>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => removeFromCart(item.partId)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Discount */}
                    {cart.length > 0 && (
                        <div className={styles.discountSection}>
                            <label className={styles.label}>Descuento</label>
                            <div className={styles.discountRow}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                />
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                                    className={styles.discountSelect}
                                >
                                    <option value="amount">Q</option>
                                    <option value="percent">%</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div className={styles.totals}>
                        <div className={styles.totalRow}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className={styles.totalRow}>
                                <span>Descuento</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div className={styles.totalRow}>
                            <span>IVA ({taxRate}%)</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>TOTAL</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.cartActions}>
                        <Button
                            variant="outline"
                            onClick={clearCart}
                            disabled={cart.length === 0}
                        >
                            Limpiar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setShowPaymentModal(true)}
                            disabled={cart.length === 0}
                        >
                            Cobrar {formatCurrency(total)}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Procesar Pago</h2>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowPaymentModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Payment Summary */}
                            <div className={styles.paymentSummary}>
                                <div className={styles.summaryRow}>
                                    <span>Total a pagar</span>
                                    <span className={styles.summaryTotal}>{formatCurrency(total)}</span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span>Pagado</span>
                                    <span>{formatCurrency(totalPaid)}</span>
                                </div>
                                {remaining > 0 && (
                                    <div className={`${styles.summaryRow} ${styles.remaining}`}>
                                        <span>Pendiente</span>
                                        <span>{formatCurrency(remaining)}</span>
                                    </div>
                                )}
                                {change > 0 && (
                                    <div className={`${styles.summaryRow} ${styles.change}`}>
                                        <span>Cambio</span>
                                        <span>{formatCurrency(change)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Payment Methods */}
                            <div className={styles.paymentMethods}>
                                <h3>Agregar Pago</h3>
                                <PaymentForm
                                    remainingAmount={remaining > 0 ? remaining : 0}
                                    onAdd={addPayment}
                                />
                            </div>

                            {/* Added Payments */}
                            {payments.length > 0 && (
                                <div className={styles.paymentsList}>
                                    <h3>Pagos Agregados</h3>
                                    {payments.map(payment => (
                                        <div key={payment.id} className={styles.paymentItem}>
                                            <span className={styles.paymentMethod}>
                                                {getPaymentMethodLabel(payment.paymentMethod)}
                                            </span>
                                            <span className={styles.paymentAmount}>
                                                {formatCurrency(payment.amount)}
                                            </span>
                                            <button
                                                className={styles.removePaymentBtn}
                                                onClick={() => removePayment(payment.id)}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Notes */}
                            <div className={styles.notesSection}>
                                <label className={styles.label}>Notas (opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas adicionales..."
                                    className={styles.notesInput}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <Button
                                variant="outline"
                                onClick={() => setShowPaymentModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={processSale}
                                disabled={isSubmitting || totalPaid < total}
                                isLoading={isSubmitting}
                            >
                                {isSubmitting ? 'Procesando...' : 'Completar Venta'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PAYMENT FORM COMPONENT
// ============================================================================

interface PaymentFormProps {
    remainingAmount: number;
    onAdd: (method: PaymentMethod, amount: number, ref?: string) => void;
}

function PaymentForm({ remainingAmount, onAdd }: PaymentFormProps) {
    const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [amount, setAmount] = useState(remainingAmount);
    const [transactionRef, setTransactionRef] = useState('');

    const handleAdd = () => {
        if (amount <= 0) return;
        onAdd(method, amount, transactionRef || undefined);
        setAmount(remainingAmount - amount > 0 ? remainingAmount - amount : 0);
        setTransactionRef('');
    };

    const needsRef = method === PaymentMethod.CARD || method === PaymentMethod.TRANSFER;

    return (
        <div className={styles.paymentForm}>
            <div className={styles.paymentFormRow}>
                <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className={styles.methodSelect}
                >
                    <option value={PaymentMethod.CASH}>Efectivo</option>
                    <option value={PaymentMethod.CARD}>Tarjeta</option>
                    <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                    <option value={PaymentMethod.CHECK}>Cheque</option>
                    <option value={PaymentMethod.OTHER}>Otro</option>
                </select>
                <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Monto"
                />
            </div>
            {needsRef && (
                <Input
                    placeholder="Referencia de transacción"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                />
            )}
            <Button
                variant="secondary"
                onClick={handleAdd}
                disabled={amount <= 0}
            >
                Agregar Pago
            </Button>
        </div>
    );
}

// ============================================================================
// HELPERS
// ============================================================================

function getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
        CASH: 'Efectivo',
        CARD: 'Tarjeta',
        TRANSFER: 'Transferencia',
        CHECK: 'Cheque',
        OTHER: 'Otro',
    };
    return labels[method];
}
