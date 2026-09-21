'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CreditNoteStatus, PaymentMethod } from '@prisma/client';
import { CreditNoteDetail } from '../types';
import styles from '../returns.module.css';

interface CreditNoteDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCreditNote: CreditNoteDetail | null;
    loading: boolean;
    onCancelCreditNote: (id: string) => Promise<void>;
    onOpenRefundModal: (creditNote: CreditNoteDetail) => void;
    getStatusBadge: (status: CreditNoteStatus) => React.ReactNode;
    getPaymentLabel: (method: PaymentMethod | null | undefined) => string;
    formatCurrency: (amount: number) => string;
    formatDate: (date: Date) => string;
}

export function CreditNoteDetailModal({
    isOpen,
    onClose,
    selectedCreditNote,
    loading,
    onCancelCreditNote,
    onOpenRefundModal,
    getStatusBadge,
    getPaymentLabel,
    formatCurrency,
    formatDate,
}: CreditNoteDetailModalProps) {
    if (!selectedCreditNote) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Nota de Crédito ${selectedCreditNote.creditNoteNumber}`}
            size="lg"
            footer={
                <>
                    {selectedCreditNote.status === 'PENDING' && (
                        <>
                            <Button
                                variant="danger"
                                onClick={() => onCancelCreditNote(selectedCreditNote.id)}
                                disabled={loading}
                                isLoading={loading}
                            >
                                Cancelar NC
                            </Button>
                            <Button
                                onClick={() => onOpenRefundModal(selectedCreditNote)}
                                disabled={loading}
                            >
                                Procesar Reembolso
                            </Button>
                        </>
                    )}
                    <Button variant="secondary" onClick={onClose}>
                        Cerrar
                    </Button>
                </>
            }
        >
            <div className={styles['detailGrid']}>
                <div className={styles['detailSection']}>
                    <h2>Información</h2>
                    <div className={styles['detailRow']}>
                        <span>Estado:</span>
                        <span>{getStatusBadge(selectedCreditNote.status)}</span>
                    </div>
                    <div className={styles['detailRow']}>
                        <span>Venta Original:</span>
                        <span>{selectedCreditNote.posSale.saleNumber}</span>
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
                        <span>Creada:</span>
                        <span>{formatDate(selectedCreditNote.createdAt)}</span>
                    </div>
                    <div className={styles['detailRow']}>
                        <span>Creada por:</span>
                        <span>{selectedCreditNote.createdBy?.name}</span>
                    </div>
                </div>
                <div className={styles['detailSection']}>
                    <h2>Reembolso</h2>
                    <div className={styles['detailRow']}>
                        <span>Método:</span>
                        <span>{getPaymentLabel(selectedCreditNote.refundMethod)}</span>
                    </div>
                    {selectedCreditNote.refundReference && (
                        <div className={styles['detailRow']}>
                            <span>Referencia:</span>
                            <span>{selectedCreditNote.refundReference}</span>
                        </div>
                    )}
                    {selectedCreditNote.processedAt && (
                        <div className={styles['detailRow']}>
                            <span>Procesada:</span>
                            <span>{formatDate(selectedCreditNote.processedAt)}</span>
                        </div>
                    )}
                    {selectedCreditNote.processedBy && (
                        <div className={styles['detailRow']}>
                            <span>Procesada por:</span>
                            <span>{selectedCreditNote.processedBy.name}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles['detailSection']}>
                <h2>Motivo</h2>
                <p>{selectedCreditNote.reason}</p>
            </div>

            {/* Items */}
            <div className={styles['itemsSection']}>
                <h2>Productos Devueltos</h2>
                <table className={styles['itemsTable']}>
                    <caption className="sr-only">Productos devueltos en la nota</caption>
                    <thead>
                        <tr>
                            <th scope="col">Producto</th>
                            <th scope="col">Cantidad</th>
                            <th scope="col">Precio Unit.</th>
                            <th scope="col">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedCreditNote.items.map((item: any) => (
                            <tr key={item.id}>
                                <td>
                                    <div>{item.part.name}</div>
                                    <small>{item.part.sku}</small>
                                </td>
                                <td>{item.quantity}</td>
                                <td>{formatCurrency(item.unitPrice)}</td>
                                <td>{formatCurrency(item.unitPrice * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className={styles['totalsSection']}>
                <div className={styles['totalsBox']} role="region" aria-label="Resumen de totales">
                    <div className={styles['totalsRow']}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(selectedCreditNote.subtotal)}</span>
                    </div>
                    <div className={styles['totalsRow']}>
                        <span>IVA ({selectedCreditNote.taxRate}%):</span>
                        <span>{formatCurrency(selectedCreditNote.taxAmount)}</span>
                    </div>
                    <div className={`${styles['totalsRow']} ${styles['total']}`}>
                        <span>Total Reembolso:</span>
                        <span>{formatCurrency(selectedCreditNote.total)}</span>
                    </div>
                </div>
            </div>

            {selectedCreditNote.notes && (
                <div className={styles['detailSection']}>
                    <h2>Notas</h2>
                    <p>{selectedCreditNote.notes}</p>
                </div>
            )}
        </Modal>
    );
}
