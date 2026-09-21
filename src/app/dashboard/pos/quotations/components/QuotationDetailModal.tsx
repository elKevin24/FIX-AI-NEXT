'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QuotationStatus } from '@prisma/client';
import { QuotationDetail } from '../types';
import styles from '../quotations.module.css';

interface QuotationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedQuotation: QuotationDetail | null;
    loading: boolean;
    onDelete: (id: string) => Promise<void>;
    onStatusChange: (id: string, status: QuotationStatus) => Promise<void>;
    onDuplicate: (id: string) => Promise<void>;
    onOpenConvert: (quotation: QuotationDetail) => void;
    getStatusBadge: (status: QuotationStatus) => React.ReactNode;
    formatCurrency: (amount: number) => string;
    formatDate: (date: Date) => string;
}

export function QuotationDetailModal({
    isOpen,
    onClose,
    selectedQuotation,
    loading,
    onDelete,
    onStatusChange,
    onDuplicate,
    onOpenConvert,
    getStatusBadge,
    formatCurrency,
    formatDate,
}: QuotationDetailModalProps) {
    if (!selectedQuotation) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Cotización ${selectedQuotation.quotationNumber}`}
            size="xl"
            footer={
                <>
                    {selectedQuotation.status === 'DRAFT' && (
                        <>
                            <Button
                                variant="danger"
                                onClick={() => onDelete(selectedQuotation.id)}
                                disabled={loading}
                                isLoading={loading}
                            >
                                Eliminar
                            </Button>
                            <Button
                                onClick={() => onStatusChange(selectedQuotation.id, 'SENT')}
                                disabled={loading}
                                isLoading={loading}
                            >
                                Marcar como Enviada
                            </Button>
                        </>
                    )}
                    {selectedQuotation.status === 'SENT' && (
                        <>
                            <Button
                                variant="danger"
                                onClick={() => onStatusChange(selectedQuotation.id, 'REJECTED')}
                                disabled={loading}
                                isLoading={loading}
                            >
                                Rechazada
                            </Button>
                            <Button
                                onClick={() => onStatusChange(selectedQuotation.id, 'ACCEPTED')}
                                disabled={loading}
                                isLoading={loading}
                            >
                                Aceptada
                            </Button>
                        </>
                    )}
                    {selectedQuotation.status === 'ACCEPTED' && (
                        <Button
                            onClick={() => onOpenConvert(selectedQuotation)}
                            disabled={loading}
                        >
                            Convertir a Venta
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => onDuplicate(selectedQuotation.id)}
                        disabled={loading}
                    >
                        Duplicar
                    </Button>
                </>
            }
        >
            <div className={styles['detailGrid']}>
                <div className={styles['detailSection']}>
                    <h2>Cliente</h2>
                    <div className={styles['detailRow']}>
                        <span>Nombre:</span>
                        <span>
                            {selectedQuotation.customer?.name || selectedQuotation.customerName}
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
                    <h2>Información</h2>
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
                <h2>Productos</h2>
                <table className={styles['itemsTable']}>
                    <caption className="sr-only">Vista previa de impresión: productos</caption>
                    <thead>
                        <tr>
                            <th scope="col">Producto</th>
                            <th scope="col">Cant.</th>
                            <th scope="col">Precio</th>
                            <th scope="col">Desc.</th>
                            <th scope="col">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedQuotation.items.map((item: any) => {
                            const itemSubtotal = item.unitPrice * item.quantity;
                            const itemDiscount = itemSubtotal * (item.discount / 100);
                            return (
                                <tr key={item.id}>
                                    <td>
                                        <div>{item.part.name}</div>
                                        <small>{item.part.sku}</small>
                                    </td>
                                    <td>{item.quantity}</td>
                                    <td>{formatCurrency(item.unitPrice)}</td>
                                    <td>{item.discount}%</td>
                                    <td>{formatCurrency(itemSubtotal - itemDiscount)}</td>
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
                            <span>-{formatCurrency(selectedQuotation.discountAmount)}</span>
                        </div>
                    )}
                    <div className={styles['totalsRow']}>
                        <span>IVA ({selectedQuotation.taxRate}%):</span>
                        <span>{formatCurrency(selectedQuotation.taxAmount)}</span>
                    </div>
                    <div className={`${styles['totalsRow']} ${styles['total']}`}>
                        <span>Total:</span>
                        <span>{formatCurrency(selectedQuotation.total)}</span>
                    </div>
                </div>
            </div>

            {selectedQuotation.notes && (
                <div className={styles['detailSection']}>
                    <h2>Notas</h2>
                    <p>{selectedQuotation.notes}</p>
                </div>
            )}
        </Modal>
    );
}
