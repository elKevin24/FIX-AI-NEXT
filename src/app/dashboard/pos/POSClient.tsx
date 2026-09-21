'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentMethod } from '@prisma/client';
import { createPOSSale, getPartsForPOS } from '@/lib/pos-actions';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import PageHeader from '@/components/PageHeader';
import POSCart, { CartItem } from './components/POSCart';
import POSPaymentModal, { PaymentItem } from './components/POSPaymentModal';
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

interface POSClientProps {
    initialParts: Part[];
    initialCustomers: Customer[];
    taxRate: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function POSClient({
    initialParts,
    initialCustomers,
    taxRate,

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
        <div className={styles['container']}>
            {/* Header */}
            <PageHeader
                title="Punto de Venta"
                subtitle="Registra ventas directas a clientes"
                actions={
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/pos/history')}
                    >
                        Historial
                    </Button>
                }
            />

            {/* Stats Bar */}
            <div className={styles['statsBar']}>
                <div className={styles['statsBarItem']}>
                    Productos: <span className={styles['statsBarValue']}>{parts.length}</span>
                </div>
                {cart.length > 0 && (
                    <>
                        <div className={styles['statsBarItem']}>
                            En carrito: <span className={styles['statsBarValue']}>{cart.length}</span>
                        </div>
                        <div className={styles['statsBarItem']}>
                            Total: <span className={styles['statsBarValue']}>{formatCurrency(total)}</span>
                        </div>
                    </>
                )}
            </div>

            {error && <Alert variant="error" className={styles['alert']}>{error}</Alert>}
            {success && <Alert variant="success" className={styles['alert']}>{success}</Alert>}

            <div className={styles['posLayout']}>
                {/* Products Grid */}
                <div className={styles['productsSection']}>
                    <div className={styles['sectionTitle']}>
                        <h2>Productos</h2>
                        <span>{filteredParts.length} disponible{filteredParts.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className={styles['searchBar']}>
                        <Input
                            placeholder="Buscar producto por nombre o SKU..."
                            value={searchProduct}
                            onChange={(e) => setSearchProduct(e.target.value)}
                        />
                    </div>

                    <div className={styles['productsGrid']}>
                        {filteredParts.length === 0 ? (
                            <div className={styles['emptyProducts']}>
                                <p>No se encontraron productos</p>
                            </div>
                        ) : (
                            filteredParts.map(part => (
                                <button
                                    key={part.id}
                                    className={styles['productCard']}
                                    onClick={() => addToCart(part)}
                                    disabled={part.quantity <= 0}
                                    aria-label={`${part.name}, ${formatCurrency(part.price)}, Stock: ${part.quantity}`}
                                >
                                    <div className={styles['productName']}>{part.name}</div>
                                    {part.sku && (
                                        <div className={styles['productSku']}>{part.sku}</div>
                                    )}
                                    <div className={styles['productPrice']}>
                                        {formatCurrency(part.price)}
                                    </div>
                                    <div className={`${styles['productStock']} ${part.quantity <= 5 ? styles['low'] : ''}`}>
                                        Stock: {part.quantity}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Cart Section */}
                <div className={styles['cartSection']}>
                    <div className={styles['sectionTitle']}>
                        <h2>Carrito</h2>
                        {cart.length > 0 && <span>{cart.reduce((s, i) => s + i.quantity, 0)} item{cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</span>}
                    </div>
                    <div className={styles['customerSection']}>
                        <label className={styles['label']}>Cliente</label>
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchCustomer}
                            onChange={(e) => setSearchCustomer(e.target.value)}
                        />
                        {searchCustomer && filteredCustomers.length > 0 && (
                            <div className={styles['customerDropdown']}>
                                {filteredCustomers.map(customer => (
                                    <button
                                        key={customer.id}
                                        className={styles['customerOption']}
                                        onClick={() => selectCustomer(customer)}
                                    >
                                        <span>{customer.name}</span>
                                        {customer.nit && <span className={styles['customerNit']}>{customer.nit}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedCustomer && (
                            <div className={styles['selectedCustomer']}>
                                <span>{customerName}</span>
                                <span>NIT: {customerNIT}</span>
                                <button
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        setCustomerName('Consumidor Final');
                                        setCustomerNIT('C/F');
                                    }}
                                    aria-label={`Eliminar cliente ${customerName}`}
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cart Section */}
                    <POSCart
                        cart={cart}
                        subtotal={subtotal}
                        discount={discount}
                        discountType={discountType}
                        discountAmount={discountAmount}
                        taxRate={taxRate}
                        taxAmount={taxAmount}
                        total={total}
                        onUpdateQuantity={updateQuantity}
                        onRemoveFromCart={removeFromCart}
                        onClearCart={clearCart}
                        onDiscountChange={setDiscount}
                        onDiscountTypeChange={setDiscountType}
                        onOpenPaymentModal={() => setShowPaymentModal(true)}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            <POSPaymentModal
                isOpen={showPaymentModal}
                total={total}
                totalPaid={totalPaid}
                remaining={remaining}
                change={change}
                payments={payments}
                notes={notes}
                isSubmitting={isSubmitting}
                onClose={() => setShowPaymentModal(false)}
                onAddPayment={addPayment}
                onRemovePayment={removePayment}
                onNotesChange={setNotes}
                onProcessSale={processSale}
            />
        </div>
    );
}
