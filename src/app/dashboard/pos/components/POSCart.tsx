'use client';

import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from '../pos.module.css';

export interface CartItem {
    partId: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    maxQuantity: number;
}

interface POSCartProps {
    cart: CartItem[];
    subtotal: number;
    discount: number;
    discountType: 'amount' | 'percent';
    discountAmount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    onUpdateQuantity: (partId: string, quantity: number) => void;
    onRemoveFromCart: (partId: string) => void;
    onClearCart: () => void;
    onDiscountChange: (discount: number) => void;
    onDiscountTypeChange: (type: 'amount' | 'percent') => void;
    onOpenPaymentModal: () => void;
}

export default function POSCart({
    cart,
    subtotal,
    discount,
    discountType,
    discountAmount,
    taxRate,
    taxAmount,
    total,
    onUpdateQuantity,
    onRemoveFromCart,
    onClearCart,
    onDiscountChange,
    onDiscountTypeChange,
    onOpenPaymentModal,
}: POSCartProps) {
    return (
        <>
            <div className={styles['cartItems']} role="region" aria-label="Lista de items en el carrito">
                {cart.length === 0 ? (
                    <div className={styles['emptyCart']}>
                        <p>El carrito está vacío</p>
                        <span>Haga clic en un producto para agregarlo</span>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.partId} className={styles['cartItem']}>
                            <div className={styles['cartItemInfo']}>
                                <h4>{item.name}</h4>
                                <span className={styles['cartItemPrice']}>
                                    {formatCurrency(item.unitPrice)}
                                </span>
                            </div>
                            <div className={styles['cartItemActions']}>
                                <button
                                    className={styles['qtyBtn']}
                                    onClick={() => onUpdateQuantity(item.partId, item.quantity - 1)}
                                    aria-label={`Reducir cantidad de ${item.name}`}
                                >
                                    -
                                </button>
                                <span className={styles['qtyValue']} aria-label={`Cantidad: ${item.quantity}`}>{item.quantity}</span>
                                <button
                                    className={styles['qtyBtn']}
                                    onClick={() => onUpdateQuantity(item.partId, item.quantity + 1)}
                                    aria-label={`Aumentar cantidad de ${item.name}`}
                                >
                                    +
                                </button>
                                <span className={styles['cartItemTotal']}>
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                </span>
                                <button
                                    className={styles['removeBtn']}
                                    onClick={() => onRemoveFromCart(item.partId)}
                                    aria-label={`Eliminar ${item.name} del carrito`}
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
                <div className={styles['discountSection']}>
                    <label className={styles['label']}>Descuento</label>
                    <div className={styles['discountRow']}>
                        <Input
                            type="number"
                            min="0"
                            value={discount}
                            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                        />
                        <select
                            value={discountType}
                            onChange={(e) => onDiscountTypeChange(e.target.value as 'amount' | 'percent')}
                            className={styles['discountSelect']}
                            aria-label="Tipo de descuento"
                        >
                            <option value="amount">Q</option>
                            <option value="percent">%</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Totals */}
            <div className={styles['totals']} role="region" aria-label="Resumen de totales">
                <div className={styles['totalRow']}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                    <div className={styles['totalRow']}>
                        <span>Descuento</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                )}
                <div className={styles['totalRow']}>
                    <span>IVA ({taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className={`${styles['totalRow']} ${styles['grandTotal']}`}>
                    <span>TOTAL</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>

            {/* Actions */}
            <div className={styles['cartActions']}>
                <Button
                    variant="ghost"
                    onClick={() => {
                        if (cart.length === 0) return;
                        if (confirm('¿Limpiar el carrito? Se perderán todos los items.')) {
                            onClearCart();
                        }
                    }}
                    disabled={cart.length === 0}
                >
                    Limpiar
                </Button>
                <Button
                    variant="primary"
                    onClick={onOpenPaymentModal}
                    disabled={cart.length === 0}
                >
                    Cobrar {formatCurrency(total)}
                </Button>
            </div>
        </>
    );
}
