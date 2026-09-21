'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Part, Customer, CartItem } from '../types';
import styles from '../quotations.module.css';

interface QuotationCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    parts: Part[];
    selectedCustomerId: string;
    setSelectedCustomerId: (id: string) => void;
    customerName: string;
    setCustomerName: (name: string) => void;
    customerPhone: string;
    setCustomerPhone: (phone: string) => void;
    customerEmail: string;
    setCustomerEmail: (email: string) => void;
    cartItems: CartItem[];
    addToCart: (part: Part) => void;
    updateCartItem: (partId: string, field: 'quantity' | 'unitPrice' | 'discount', value: number) => void;
    removeFromCart: (partId: string) => void;
    productSearch: string;
    setProductSearch: (search: string) => void;
    productResults: Part[];
    globalDiscount: number;
    setGlobalDiscount: (discount: number) => void;
    validDays: number;
    setValidDays: (days: number) => void;
    notes: string;
    setNotes: (notes: string) => void;
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
    taxRate: number;
    loading: boolean;
    onCreateQuotation: () => Promise<void>;
    formatCurrency: (amount: number) => string;
}

export function QuotationCreateModal({
    isOpen,
    onClose,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    customerEmail,
    setCustomerEmail,
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    productSearch,
    setProductSearch,
    productResults,
    globalDiscount,
    setGlobalDiscount,
    validDays,
    setValidDays,
    notes,
    setNotes,
    subtotal,
    discountAmount,
    tax,
    total,
    taxRate,
    loading,
    onCreateQuotation,
    formatCurrency,
}: QuotationCreateModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva Cotización"
            size="xl"
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onCreateQuotation}
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
                <h2>Productos</h2>
                <table className={styles['itemsTable']}>
                    <caption className="sr-only">Productos agregados a la cotización</caption>
                    <thead>
                        <tr>
                            <th scope="col">Producto</th>
                            <th scope="col">Cant.</th>
                            <th scope="col">Precio</th>
                            <th scope="col">Desc. %</th>
                            <th scope="col">Subtotal</th>
                            <th scope="col"></th>
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
                            cartItems.map((item) => {
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
    );
}
