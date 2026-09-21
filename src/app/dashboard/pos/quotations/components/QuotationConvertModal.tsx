'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentMethod } from '@prisma/client';
import { QuotationDetail, Payment } from '../types';
import styles from '../quotations.module.css';

interface QuotationConvertModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedQuotation: QuotationDetail | null;
    loading: boolean;
    payments: Payment[];
    selectedPaymentMethod: PaymentMethod;
    setSelectedPaymentMethod: (method: PaymentMethod) => void;
    addPayment: () => void;
    updatePayment: (index: number, field: 'amount' | 'reference', value: string | number) => void;
    removePayment: (index: number) => void;
    onConvertToSale: () => Promise<void>;
    formatCurrency: (amount: number) => string;
    getPaymentLabel: (method: PaymentMethod) => string;
}

export function QuotationConvertModal({
    isOpen,
    onClose,
    selectedQuotation,
    loading,
    payments,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    addPayment,
    updatePayment,
    removePayment,
    onConvertToSale,
    formatCurrency,
    getPaymentLabel,
}: QuotationConvertModalProps) {
    if (!selectedQuotation) return null;

    const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
    const remainingAmount = selectedQuotation.total - totalPayments;
    const isRemainingPositive = remainingAmount > 0.01;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Convertir a Venta"
            size="lg"
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConvertToSale}
                        disabled={loading || isRemainingPositive}
                        isLoading={loading}
                    >
                        {loading ? 'Procesando...' : 'Confirmar Venta'}
                    </Button>
                </>
            }
        >
            <div className={styles['detailSection']}>
                <h2>Cotización</h2>
                <div className={styles['detailRow']}>
                    <span>Número:</span>
                    <span>{selectedQuotation.quotationNumber}</span>
                </div>
                <div className={styles['detailRow']}>
                    <span>Cliente:</span>
                    <span>
                        {selectedQuotation.customer?.name || selectedQuotation.customerName}
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
                <h2>Métodos de Pago</h2>
                <div className={styles['paymentMethods']}>
                    {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map((method) => (
                        <button
                            key={method}
                            className={`${styles['paymentMethodBtn']} ${
                                selectedPaymentMethod === method ? styles['active'] : ''
                            }`}
                            onClick={() => setSelectedPaymentMethod(method)}
                            aria-pressed={selectedPaymentMethod === method}
                            aria-label={`Seleccionar método: ${getPaymentLabel(method)}`}
                        >
                            {getPaymentLabel(method)}
                        </button>
                    ))}
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
                                        updatePayment(index, 'reference', e.target.value)
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
                    <span>{formatCurrency(totalPayments)}</span>
                </div>
                <div className={styles['paymentSummary']}>
                    <span>
                        {isRemainingPositive ? 'Pendiente:' : 'Pago completo:'}
                    </span>
                    <span
                        className={`${styles['remaining']} ${
                            isRemainingPositive ? styles['error'] : styles['success']
                        }`}
                    >
                        {formatCurrency(remainingAmount)}
                    </span>
                </div>
            </div>
        </Modal>
    );
}
