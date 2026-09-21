'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SaleSearchResult, SaleForReturn, ReturnItem } from '../types';
import styles from '../returns.module.css';

interface CreateReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    loading: boolean;
    selectedSale: SaleForReturn | null;
    setSelectedSale: (sale: SaleForReturn | null) => void;
    saleSearch: string;
    onSaleSearch: (search: string) => Promise<void>;
    saleSearchResults: SaleSearchResult[];
    onSelectSale: (saleId: string) => Promise<void>;
    returnItems: ReturnItem[];
    setReturnItems: React.Dispatch<React.SetStateAction<ReturnItem[]>>;
    onToggleItemSelection: (partId: string) => void;
    onUpdateReturnQuantity: (partId: string, qty: number) => void;
    subtotal: number;
    taxAmount: number;
    total: number;
    returnReason: string;
    setReturnReason: (reason: string) => void;
    returnNotes: string;
    setReturnNotes: (notes: string) => void;
    onCreateCreditNote: () => Promise<void>;
    formatCurrency: (amount: number) => string;
    formatDate: (date: Date) => string;
}

export function CreateReturnModal({
    isOpen,
    onClose,
    loading,
    selectedSale,
    setSelectedSale,
    saleSearch,
    onSaleSearch,
    saleSearchResults,
    onSelectSale,
    returnItems,
    setReturnItems,
    onToggleItemSelection,
    onUpdateReturnQuantity,
    subtotal,
    taxAmount,
    total,
    returnReason,
    setReturnReason,
    returnNotes,
    setReturnNotes,
    onCreateCreditNote,
    formatCurrency,
    formatDate,
}: CreateReturnModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva Nota de Crédito / Devolución"
            size="xl"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={onCreateCreditNote}
                        disabled={loading || !selectedSale || total === 0}
                        isLoading={loading}
                    >
                        Crear Nota de Crédito
                    </Button>
                </>
            }
        >
            {/* Sale Search */}
            {!selectedSale && (
                <div className={styles['searchSection']}>
                    <h2>Buscar Venta Original</h2>
                    <input
                        type="text"
                        placeholder="Buscar por número de venta o cliente..."
                        value={saleSearch}
                        onChange={(e) => onSaleSearch(e.target.value)}
                        className={styles['searchInput']}
                        aria-label="Buscar venta por número o cliente"
                    />
                    {saleSearchResults.length > 0 && (
                        <div className={styles['searchResults']}>
                            {saleSearchResults.map((sale) => (
                                <button
                                    key={sale.id}
                                    type="button"
                                    className={styles['searchResult']}
                                    onClick={() => onSelectSale(sale.id)}
                                    aria-label={`Seleccionar venta ${sale.saleNumber}, ${sale.customerName || 'Consumidor Final'}, ${formatCurrency(sale.total)}`}
                                >
                                    <div className={styles['searchResultInfo']}>
                                        <span className={styles['searchResultNumber']}>
                                            {sale.saleNumber}
                                        </span>
                                        <span className={styles['searchResultCustomer']}>
                                            {sale.customerName || 'Consumidor Final'} •{' '}
                                            {formatDate(sale.createdAt)}
                                        </span>
                                    </div>
                                    <span className={styles['searchResultTotal']}>
                                        {formatCurrency(sale.total)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Selected Sale Details */}
            {selectedSale && (
                <>
                    <div className={styles['saleDetails']}>
                        <h2>
                            Venta: {selectedSale.saleNumber}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedSale(null);
                                    setReturnItems([]);
                                }}
                            >
                                Cambiar
                            </Button>
                        </h2>
                        <div className={styles['saleDetailsGrid']}>
                            <div className={styles['saleDetailRow']}>
                                <span>Cliente:</span>
                                <span>
                                    {selectedSale.customer?.name ||
                                        selectedSale.customerName ||
                                        'Consumidor Final'}
                                </span>
                            </div>
                            <div className={styles['saleDetailRow']}>
                                <span>Fecha:</span>
                                <span>{formatDate(selectedSale.createdAt)}</span>
                            </div>
                            <div className={styles['saleDetailRow']}>
                                <span>Total Original:</span>
                                <span>{formatCurrency(selectedSale.total)}</span>
                            </div>
                            <div className={styles['saleDetailRow']}>
                                <span>Estado:</span>
                                <span>{selectedSale.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Selection */}
                    <div className={styles['itemsSection']}>
                        <h2>Productos a Devolver</h2>
                        <table className={styles['itemsTable']}>
                            <caption className="sr-only">Productos a devolver de la venta original</caption>
                            <thead>
                                <tr>
                                    <th scope="col"></th>
                                    <th scope="col">Producto</th>
                                    <th scope="col">Comprado</th>
                                    <th scope="col">Disponible</th>
                                    <th scope="col">Devolver</th>
                                    <th scope="col">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((item) => (
                                    <tr key={item.partId}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() =>
                                                    onToggleItemSelection(item.partId)
                                                }
                                                disabled={item.availableForReturn === 0}
                                                className={styles['itemCheckbox']}
                                                aria-label={`Seleccionar ${item.partName} para devolución`}
                                            />
                                        </td>
                                        <td>
                                            <div>{item.partName}</div>
                                            <small>{item.partSku}</small>
                                        </td>
                                        <td>{item.originalQuantity}</td>
                                        <td>
                                            {item.availableForReturn === 0 ? (
                                                <span className={styles['noAvailable']}>
                                                    Ya devuelto
                                                </span>
                                            ) : (
                                                item.availableForReturn
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.availableForReturn}
                                                value={item.returnQuantity}
                                                onChange={(e) =>
                                                    onUpdateReturnQuantity(
                                                        item.partId,
                                                        parseInt(e.target.value) || 0
                                                    )
                                                }
                                                disabled={
                                                    !item.selected ||
                                                    item.availableForReturn === 0
                                                }
                                                className={styles['itemInput']}
                                                aria-label={`Cantidad a devolver de ${item.partName}`}
                                            />
                                        </td>
                                        <td>
                                            {item.selected && item.returnQuantity > 0
                                                ? formatCurrency(
                                                      item.unitPrice * item.returnQuantity
                                                  )
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className={styles['totalsSection']}>
                        <div className={styles['totalsBox']} role="region" aria-label="Resumen de devolución">
                            <div className={styles['totalsRow']}>
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className={styles['totalsRow']}>
                                <span>IVA ({selectedSale.taxRate}%):</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className={`${styles['totalsRow']} ${styles['total']}`}>
                                <span>Total a Reembolsar:</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className={styles['formGroup']}>
                        <label htmlFor="returnReason">
                            Motivo de la Devolución{' '}
                            <span className={styles['required']}>*</span>
                        </label>
                        <textarea
                            id="returnReason"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            rows={2}
                            placeholder="Ej: Producto defectuoso, Error en compra..."
                        />
                    </div>

                    <div className={styles['formGroup']}>
                        <label htmlFor="returnNotes">Notas Adicionales</label>
                        <textarea
                            id="returnNotes"
                            value={returnNotes}
                            onChange={(e) => setReturnNotes(e.target.value)}
                            rows={2}
                            placeholder="Observaciones adicionales..."
                        />
                    </div>
                </>
            )}
        </Modal>
    );
}
