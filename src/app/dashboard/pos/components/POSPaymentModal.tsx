'use client';

import { useState } from 'react';
import { PaymentMethod } from '@prisma/client';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from '../pos.module.css';

export interface PaymentItem {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionRef?: string;
}

interface POSPaymentModalProps {
    isOpen: boolean;
    total: number;
    totalPaid: number;
    remaining: number;
    change: number;
    payments: PaymentItem[];
    notes: string;
    isSubmitting: boolean;
    onClose: () => void;
    onAddPayment: (method: PaymentMethod, amount: number, ref?: string) => void;
    onRemovePayment: (id: string) => void;
    onNotesChange: (notes: string) => void;
    onProcessSale: () => void;
}

export default function POSPaymentModal({
    isOpen,
    total,
    totalPaid,
    remaining,
    change,
    payments,
    notes,
    isSubmitting,
    onClose,
    onAddPayment,
    onRemovePayment,
    onNotesChange,
    onProcessSale,
}: POSPaymentModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles['modalOverlay']}>
            <div className={styles['modal']}>
                <div className={styles['modalHeader']}>
                    <h2>Procesar Pago</h2>
                    <button
                        className={styles['modalClose']}
                        onClick={onClose}
                        aria-label="Cerrar modal de pago"
                    >
                        &times;
                    </button>
                </div>

                <div className={styles['modalBody']}>
                    {/* Payment Summary */}
                    <div className={styles['paymentSummary']}>
                        <div className={styles['summaryRow']}>
                            <span>Total a pagar</span>
                            <span className={styles['summaryTotal']}>{formatCurrency(total)}</span>
                        </div>
                        <div className={styles['summaryRow']}>
                            <span>Pagado</span>
                            <span>{formatCurrency(totalPaid)}</span>
                        </div>
                        {remaining > 0 && (
                            <div className={`${styles['summaryRow']} ${styles['remaining']}`}>
                                <span>Pendiente</span>
                                <span>{formatCurrency(remaining)}</span>
                            </div>
                        )}
                        {change > 0 && (
                            <div className={`${styles['summaryRow']} ${styles['change']}`}>
                                <span>Cambio</span>
                                <span>{formatCurrency(change)}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment Methods */}
                    <div className={styles['paymentMethods']}>
                        <h3>Agregar Pago</h3>
                        <PaymentForm
                            remainingAmount={remaining > 0 ? remaining : 0}
                            onAdd={onAddPayment}
                        />
                    </div>

                    {/* Added Payments */}
                    {payments.length > 0 && (
                        <div className={styles['paymentsList']}>
                            <h3>Pagos Agregados</h3>
                            {payments.map((payment) => (
                                <div key={payment.id} className={styles['paymentItem']}>
                                    <span className={styles['paymentMethod']}>
                                        {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                                    </span>
                                    <span className={styles['paymentAmount']}>
                                        {formatCurrency(payment.amount)}
                                    </span>
                                    <button
                                        className={styles['removePaymentBtn']}
                                        onClick={() => onRemovePayment(payment.id)}
                                        aria-label={`Eliminar pago ${PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod} de ${formatCurrency(payment.amount)}`}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    <div className={styles['notesSection']}>
                        <label className={styles['label']}>Notas (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => onNotesChange(e.target.value)}
                            placeholder="Notas adicionales..."
                            className={styles['notesInput']}
                        />
                    </div>
                </div>

                <div className={styles['modalFooter']}>
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onProcessSale}
                        disabled={isSubmitting || totalPaid < total}
                        isLoading={isSubmitting}
                    >
                        {isSubmitting ? 'Procesando...' : 'Completar Venta'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

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
        <div className={styles['paymentForm']}>
            <div className={styles['paymentFormRow']}>
                <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className={styles['methodSelect']}
                    aria-label="Método de pago"
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
