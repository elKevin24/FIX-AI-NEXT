'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentMethod } from '@prisma/client';
import { CreditNoteDetail } from '../types';
import styles from '../returns.module.css';

interface CreditNoteRefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCreditNote: CreditNoteDetail | null;
    loading: boolean;
    refundMethod: PaymentMethod;
    setRefundMethod: (method: PaymentMethod) => void;
    refundReference: string;
    setRefundReference: (ref: string) => void;
    onProcessRefund: () => Promise<void>;
    getPaymentLabel: (method: PaymentMethod | null | undefined) => string;
    formatCurrency: (amount: number) => string;
}

export function CreditNoteRefundModal({
    isOpen,
    onClose,
    selectedCreditNote,
    loading,
    refundMethod,
    setRefundMethod,
    refundReference,
    setRefundReference,
    onProcessRefund,
    getPaymentLabel,
    formatCurrency,
}: CreditNoteRefundModalProps) {
    if (!selectedCreditNote) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Procesar Reembolso"
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={onProcessRefund}
                        disabled={loading}
                        isLoading={loading}
                    >
                        Confirmar Reembolso
                    </Button>
                </>
            }
        >
            <div className={styles['detailSection']}>
                <h2>Nota de Crédito</h2>
                <div className={styles['detailRow']}>
                    <span>Número:</span>
                    <span>{selectedCreditNote.creditNoteNumber}</span>
                </div>
                <div className={styles['detailRow']}>
                    <span>Cliente:</span>
                    <span>
                        {selectedCreditNote.posSale.customer?.name ||
                            selectedCreditNote.posSale.customerName ||
                            'Consumidor Final'}
                    </span>
                </div>
                <div className={styles['detailRow']}>
                    <span>Total a Reembolsar:</span>
                    <span className={styles['refundTotal']}>
                        {formatCurrency(selectedCreditNote.total)}
                    </span>
                </div>
            </div>

            <div className={styles['refundSection']}>
                <h2>Método de Reembolso</h2>
                <div className={styles['refundMethods']}>
                    {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map((method) => (
                        <button
                            key={method}
                            className={`${styles['refundMethodBtn']} ${
                                refundMethod === method ? styles['active'] : ''
                            }`}
                            onClick={() => setRefundMethod(method)}
                            aria-pressed={refundMethod === method}
                            aria-label={`Seleccionar método: ${getPaymentLabel(method)}`}
                        >
                            {getPaymentLabel(method)}
                        </button>
                    ))}
                </div>
            </div>

            {refundMethod !== 'CASH' && (
                <div className={styles['formGroup']}>
                    <label htmlFor="refundReference">Referencia de Transacción</label>
                    <input
                        id="refundReference"
                        type="text"
                        value={refundReference}
                        onChange={(e) => setRefundReference(e.target.value)}
                        placeholder="Número de autorización o referencia..."
                    />
                </div>
            )}
        </Modal>
    );
}
