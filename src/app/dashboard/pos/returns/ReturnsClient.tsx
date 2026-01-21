'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import {
    CreditNoteListItem,
    createCreditNote,
    getCreditNoteById,
    processRefund,
    cancelCreditNote,
    searchSalesForReturn,
    getPOSSaleForReturn,
} from '@/lib/credit-note-actions';
import { CreditNoteStatus, PaymentMethod } from '@prisma/client';
import styles from './returns.module.css';

// Types
type SaleSearchResult = {
    id: string;
    saleNumber: string;
    customerName: string | null;
    total: number;
    status: string;
    createdAt: Date;
};

type SaleForReturn = Awaited<ReturnType<typeof getPOSSaleForReturn>>;
type CreditNoteDetail = Awaited<ReturnType<typeof getCreditNoteById>>;

type ReturnItem = {
    partId: string;
    partName: string;
    partSku: string;
    originalQuantity: number;
    availableForReturn: number;
    returnQuantity: number;
    unitPrice: number;
    selected: boolean;
};

interface Props {
    initialCreditNotes: CreditNoteListItem[];
    stats: {
        totalCreditNotes: number;
        thisMonthCreditNotes: number;
        pendingCreditNotes: number;
        processedThisMonth: number;
        totalRefundedAmount: number;
    };
}

export function ReturnsClient({ initialCreditNotes, stats }: Props) {
    const router = useRouter();
    const { addToast } = useToast();

    // State
    const [creditNotes, setCreditNotes] = useState(initialCreditNotes);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CreditNoteStatus | ''>('');
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNoteDetail | null>(null);

    // Create form state
    const [saleSearch, setSaleSearch] = useState('');
    const [saleSearchResults, setSaleSearchResults] = useState<SaleSearchResult[]>([]);
    const [selectedSale, setSelectedSale] = useState<SaleForReturn | null>(null);
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [returnReason, setReturnReason] = useState('');
    const [returnNotes, setReturnNotes] = useState('');

    // Refund form state
    const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH');
    const [refundReference, setRefundReference] = useState('');

    // Filtered credit notes
    const filteredCreditNotes = useMemo(() => {
        return creditNotes.filter((cn) => {
            const matchesSearch =
                !searchTerm ||
                cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cn.posSale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cn.posSale.customerName?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = !statusFilter || cn.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [creditNotes, searchTerm, statusFilter]);

    // Calculate return totals
    const { subtotal, taxAmount, total } = useMemo(() => {
        if (!selectedSale) return { subtotal: 0, taxAmount: 0, total: 0 };

        let sub = 0;
        returnItems.forEach((item) => {
            if (item.selected && item.returnQuantity > 0) {
                sub += item.unitPrice * item.returnQuantity;
            }
        });

        const tax = sub * (selectedSale.taxRate / 100);
        return {
            subtotal: sub,
            taxAmount: tax,
            total: sub + tax,
        };
    }, [returnItems, selectedSale]);

    // Handlers
    const handleSaleSearch = async (search: string) => {
        setSaleSearch(search);
        if (search.length >= 2) {
            try {
                const results = await searchSalesForReturn(search);
                setSaleSearchResults(results);
            } catch {
                setSaleSearchResults([]);
            }
        } else {
            setSaleSearchResults([]);
        }
    };

    const handleSelectSale = async (saleId: string) => {
        setLoading(true);
        try {
            const sale = await getPOSSaleForReturn(saleId);
            setSelectedSale(sale);
            setReturnItems(
                sale.items.map((item: any) => ({
                    partId: item.partId,
                    partName: item.part.name,
                    partSku: item.part.sku,
                    originalQuantity: item.quantity,
                    availableForReturn: item.availableForReturn,
                    returnQuantity: 0,
                    unitPrice: item.unitPrice,
                    selected: false,
                }))
            );
            setSaleSearch('');
            setSaleSearchResults([]);
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al cargar venta',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (partId: string) => {
        setReturnItems((prev) =>
            prev.map((item) =>
                item.partId === partId
                    ? {
                          ...item,
                          selected: !item.selected,
                          returnQuantity: !item.selected
                              ? item.availableForReturn
                              : 0,
                      }
                    : item
            )
        );
    };

    const updateReturnQuantity = (partId: string, quantity: number) => {
        setReturnItems((prev) =>
            prev.map((item) =>
                item.partId === partId
                    ? {
                          ...item,
                          returnQuantity: Math.min(
                              Math.max(0, quantity),
                              item.availableForReturn
                          ),
                      }
                    : item
            )
        );
    };

    const resetForm = () => {
        setSaleSearch('');
        setSaleSearchResults([]);
        setSelectedSale(null);
        setReturnItems([]);
        setReturnReason('');
        setReturnNotes('');
    };

    const handleCreateCreditNote = async () => {
        if (!selectedSale) return;

        const itemsToReturn = returnItems.filter(
            (item) => item.selected && item.returnQuantity > 0
        );

        if (itemsToReturn.length === 0) {
            addToast('Debe seleccionar al menos un producto', 'ERROR');
            return;
        }

        if (!returnReason.trim()) {
            addToast('Debe especificar el motivo de la devolución', 'ERROR');
            return;
        }

        setLoading(true);
        try {
            await createCreditNote({
                posSaleId: selectedSale.id,
                items: itemsToReturn.map((item) => ({
                    partId: item.partId,
                    quantity: item.returnQuantity,
                    unitPrice: item.unitPrice,
                })),
                reason: returnReason,
                notes: returnNotes || undefined,
            });

            addToast('Nota de crédito creada exitosamente', 'SUCCESS');
            setShowCreateModal(false);
            resetForm();
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al crear nota de crédito',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (creditNote: CreditNoteListItem) => {
        setLoading(true);
        try {
            const detail = await getCreditNoteById(creditNote.id);
            setSelectedCreditNote(detail);
            setShowDetailModal(true);
        } catch (error) {
            addToast('Error al cargar nota de crédito', 'ERROR');
        } finally {
            setLoading(false);
        }
    };

    const openRefundModal = (creditNote: CreditNoteDetail) => {
        setSelectedCreditNote(creditNote);
        setShowDetailModal(false);
        setShowRefundModal(true);
    };

    const handleProcessRefund = async () => {
        if (!selectedCreditNote) return;

        setLoading(true);
        try {
            await processRefund({
                creditNoteId: selectedCreditNote.id,
                refundMethod,
                refundReference: refundReference || undefined,
            });

            addToast('Reembolso procesado exitosamente', 'SUCCESS');
            setShowRefundModal(false);
            setSelectedCreditNote(null);
            setRefundMethod('CASH');
            setRefundReference('');
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al procesar reembolso',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancelCreditNote = async (id: string) => {
        const reason = prompt('Ingrese el motivo de la cancelación:');
        if (!reason) return;

        setLoading(true);
        try {
            await cancelCreditNote(id, reason);
            addToast('Nota de crédito cancelada', 'SUCCESS');
            setShowDetailModal(false);
            router.refresh();
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al cancelar',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    // Status badge config
    const getStatusBadge = (status: CreditNoteStatus) => {
        const config: Record<
            CreditNoteStatus,
            { variant: 'success' | 'error' | 'warning' | 'info' | 'gray'; label: string }
        > = {
            PENDING: { variant: 'warning', label: 'Pendiente' },
            PROCESSED: { variant: 'success', label: 'Procesada' },
            CANCELLED: { variant: 'error', label: 'Cancelada' },
        };
        const { variant, label } = config[status];
        return <Badge variant={variant}>{label}</Badge>;
    };

    const formatCurrency = (amount: number) => `Q${amount.toFixed(2)}`;
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Devoluciones y Notas de Crédito</h1>
                    <p>Gestión de devoluciones y reembolsos</p>
                </div>
                <div className={styles.actions}>
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Nueva Devolución
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total NC</h3>
                    <div className={styles.value}>{stats.totalCreditNotes}</div>
                </div>
                <div className={`${styles.statCard} ${styles.warning}`}>
                    <h3>Pendientes</h3>
                    <div className={styles.value}>{stats.pendingCreditNotes}</div>
                </div>
                <div className={styles.statCard}>
                    <h3>Procesadas (mes)</h3>
                    <div className={styles.value}>{stats.processedThisMonth}</div>
                </div>
                <div className={`${styles.statCard} ${styles.error}`}>
                    <h3>Total Reembolsado</h3>
                    <div className={styles.value}>
                        {formatCurrency(stats.totalRefundedAmount)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filtersBar}>
                <input
                    type="text"
                    placeholder="Buscar por número o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CreditNoteStatus | '')}
                    className={styles.filterSelect}
                >
                    <option value="">Todos los estados</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="PROCESSED">Procesada</option>
                    <option value="CANCELLED">Cancelada</option>
                </select>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nota de Crédito</th>
                            <th>Venta Original</th>
                            <th>Motivo</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCreditNotes.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    <div className={styles.emptyState}>
                                        <h3>No hay notas de crédito</h3>
                                        <p>Crea una nueva devolución para comenzar</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredCreditNotes.map((cn) => (
                                <tr key={cn.id}>
                                    <td>
                                        <span className={styles.creditNoteNumber}>
                                            {cn.creditNoteNumber}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.saleInfo}>
                                            <span className={styles.saleNumber}>
                                                {cn.posSale.saleNumber}
                                            </span>
                                            <span className={styles.customerName}>
                                                {cn.posSale.customerName || 'Consumidor Final'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.reason} title={cn.reason}>
                                            {cn.reason}
                                        </span>
                                    </td>
                                    <td className={styles.amount}>
                                        -{formatCurrency(cn.total)}
                                    </td>
                                    <td>{getStatusBadge(cn.status)}</td>
                                    <td>{formatDate(cn.createdAt)}</td>
                                    <td>
                                        <div className={styles.actionsCell}>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => handleViewDetail(cn)}
                                            >
                                                Ver
                                            </button>
                                            {cn.status === 'PENDING' && (
                                                <button
                                                    className={`${styles.actionBtn} ${styles.primary}`}
                                                    onClick={() => handleViewDetail(cn)}
                                                >
                                                    Procesar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Nueva Devolución</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Sale Search */}
                            {!selectedSale && (
                                <div className={styles.searchSection}>
                                    <h3>Buscar Venta Original</h3>
                                    <input
                                        type="text"
                                        placeholder="Buscar por número de venta o cliente..."
                                        value={saleSearch}
                                        onChange={(e) => handleSaleSearch(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                    {saleSearchResults.length > 0 && (
                                        <div className={styles.searchResults}>
                                            {saleSearchResults.map((sale) => (
                                                <div
                                                    key={sale.id}
                                                    className={styles.searchResult}
                                                    onClick={() => handleSelectSale(sale.id)}
                                                >
                                                    <div className={styles.searchResultInfo}>
                                                        <span className={styles.searchResultNumber}>
                                                            {sale.saleNumber}
                                                        </span>
                                                        <span className={styles.searchResultCustomer}>
                                                            {sale.customerName || 'Consumidor Final'} •{' '}
                                                            {formatDate(sale.createdAt)}
                                                        </span>
                                                    </div>
                                                    <span className={styles.searchResultTotal}>
                                                        {formatCurrency(sale.total)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Selected Sale Details */}
                            {selectedSale && (
                                <>
                                    <div className={styles.saleDetails}>
                                        <h3>
                                            Venta: {selectedSale.saleNumber}
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedSale(null);
                                                    setReturnItems([]);
                                                }}
                                                style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            >
                                                Cambiar
                                            </Button>
                                        </h3>
                                        <div className={styles.saleDetailsGrid}>
                                            <div className={styles.saleDetailRow}>
                                                <label>Cliente:</label>
                                                <span>
                                                    {selectedSale.customer?.name ||
                                                        selectedSale.customerName ||
                                                        'Consumidor Final'}
                                                </span>
                                            </div>
                                            <div className={styles.saleDetailRow}>
                                                <label>Fecha:</label>
                                                <span>{formatDate(selectedSale.createdAt)}</span>
                                            </div>
                                            <div className={styles.saleDetailRow}>
                                                <label>Total Original:</label>
                                                <span>{formatCurrency(selectedSale.total)}</span>
                                            </div>
                                            <div className={styles.saleDetailRow}>
                                                <label>Estado:</label>
                                                <span>{selectedSale.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Selection */}
                                    <div className={styles.itemsSection}>
                                        <h3>Productos a Devolver</h3>
                                        <table className={styles.itemsTable}>
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th>Producto</th>
                                                    <th>Comprado</th>
                                                    <th>Disponible</th>
                                                    <th>Devolver</th>
                                                    <th>Subtotal</th>
                                                </tr>
                                            </thead>
                                                                                <tbody>
                                                                                    {returnItems.map((item: any) => (
                                                                                        <tr key={item.partId}>                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={item.selected}
                                                                onChange={() =>
                                                                    toggleItemSelection(item.partId)
                                                                }
                                                                disabled={item.availableForReturn === 0}
                                                                className={styles.itemCheckbox}
                                                            />
                                                        </td>
                                                        <td>
                                                            <div>{item.partName}</div>
                                                            <small>{item.partSku}</small>
                                                        </td>
                                                        <td>{item.originalQuantity}</td>
                                                        <td>
                                                            {item.availableForReturn === 0 ? (
                                                                <span className={styles.noAvailable}>
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
                                                                    updateReturnQuantity(
                                                                        item.partId,
                                                                        parseInt(e.target.value) || 0
                                                                    )
                                                                }
                                                                disabled={
                                                                    !item.selected ||
                                                                    item.availableForReturn === 0
                                                                }
                                                                className={styles.itemInput}
                                                            />
                                                        </td>
                                                        <td>
                                                            {item.selected && item.returnQuantity > 0
                                                                ? formatCurrency(
                                                                      item.unitPrice *
                                                                          item.returnQuantity
                                                                  )
                                                                : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className={styles.totalsSection}>
                                        <div className={styles.totalsBox}>
                                            <div className={styles.totalsRow}>
                                                <span>Subtotal:</span>
                                                <span>{formatCurrency(subtotal)}</span>
                                            </div>
                                            <div className={styles.totalsRow}>
                                                <span>IVA ({selectedSale.taxRate}%):</span>
                                                <span>{formatCurrency(taxAmount)}</span>
                                            </div>
                                            <div className={`${styles.totalsRow} ${styles.total}`}>
                                                <span>Total a Reembolsar:</span>
                                                <span>{formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className={styles.formGroup}>
                                        <label>
                                            Motivo de la Devolución{' '}
                                            <span className={styles.required}>*</span>
                                        </label>
                                        <textarea
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            rows={2}
                                            placeholder="Ej: Producto defectuoso, Error en compra..."
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Notas Adicionales</label>
                                        <textarea
                                            value={returnNotes}
                                            onChange={(e) => setReturnNotes(e.target.value)}
                                            rows={2}
                                            placeholder="Observaciones adicionales..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateCreditNote}
                                disabled={loading || !selectedSale || total === 0}
                            >
                                {loading ? 'Creando...' : 'Crear Nota de Crédito'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedCreditNote && (
                <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Nota de Crédito {selectedCreditNote.creditNoteNumber}</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailSection}>
                                    <h3>Información</h3>
                                    <div className={styles.detailRow}>
                                        <label>Estado:</label>
                                        <span>
                                            {getStatusBadge(selectedCreditNote.status)}
                                        </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Venta Original:</label>
                                        <span>{selectedCreditNote.posSale.saleNumber}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Cliente:</label>
                                        <span>
                                            {selectedCreditNote.posSale.customer?.name ||
                                                selectedCreditNote.posSale.customerName ||
                                                'Consumidor Final'}
                                        </span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Creada:</label>
                                        <span>{formatDate(selectedCreditNote.createdAt)}</span>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <label>Creada por:</label>
                                        <span>{selectedCreditNote.createdBy?.name}</span>
                                    </div>
                                </div>
                                <div className={styles.detailSection}>
                                    <h3>Reembolso</h3>
                                    <div className={styles.detailRow}>
                                        <label>Método:</label>
                                        <span>
                                            {selectedCreditNote.refundMethod
                                                ? selectedCreditNote.refundMethod === 'CASH'
                                                    ? 'Efectivo'
                                                    : selectedCreditNote.refundMethod === 'CARD'
                                                    ? 'Tarjeta'
                                                    : 'Transferencia'
                                                : 'Pendiente'}
                                        </span>
                                    </div>
                                    {selectedCreditNote.refundReference && (
                                        <div className={styles.detailRow}>
                                            <label>Referencia:</label>
                                            <span>{selectedCreditNote.refundReference}</span>
                                        </div>
                                    )}
                                    {selectedCreditNote.processedAt && (
                                        <div className={styles.detailRow}>
                                            <label>Procesada:</label>
                                            <span>
                                                {formatDate(selectedCreditNote.processedAt)}
                                            </span>
                                        </div>
                                    )}
                                    {selectedCreditNote.processedBy && (
                                        <div className={styles.detailRow}>
                                            <label>Procesada por:</label>
                                            <span>{selectedCreditNote.processedBy.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.detailSection}>
                                <h3>Motivo</h3>
                                <p>{selectedCreditNote.reason}</p>
                            </div>

                            {/* Items */}
                            <div className={styles.itemsSection}>
                                <h3>Productos Devueltos</h3>
                                <table className={styles.itemsTable}>
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Precio Unit.</th>
                                            <th>Subtotal</th>
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
                                                <td>
                                                    {formatCurrency(
                                                        item.unitPrice * item.quantity
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className={styles.totalsSection}>
                                <div className={styles.totalsBox}>
                                    <div className={styles.totalsRow}>
                                        <span>Subtotal:</span>
                                        <span>
                                            {formatCurrency(selectedCreditNote.subtotal)}
                                        </span>
                                    </div>
                                    <div className={styles.totalsRow}>
                                        <span>IVA ({selectedCreditNote.taxRate}%):</span>
                                        <span>
                                            {formatCurrency(selectedCreditNote.taxAmount)}
                                        </span>
                                    </div>
                                    <div className={`${styles.totalsRow} ${styles.total}`}>
                                        <span>Total Reembolso:</span>
                                        <span>
                                            {formatCurrency(selectedCreditNote.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedCreditNote.notes && (
                                <div className={styles.detailSection}>
                                    <h3>Notas</h3>
                                    <p>{selectedCreditNote.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            {selectedCreditNote.status === 'PENDING' && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() =>
                                            handleCancelCreditNote(selectedCreditNote.id)
                                        }
                                        disabled={loading}
                                    >
                                        Cancelar NC
                                    </Button>
                                    <Button
                                        onClick={() => openRefundModal(selectedCreditNote)}
                                        disabled={loading}
                                    >
                                        Procesar Reembolso
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && selectedCreditNote && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setShowRefundModal(false)}
                >
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Procesar Reembolso</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowRefundModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.detailSection}>
                                <h3>Nota de Crédito</h3>
                                <div className={styles.detailRow}>
                                    <label>Número:</label>
                                    <span>{selectedCreditNote.creditNoteNumber}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <label>Cliente:</label>
                                    <span>
                                        {selectedCreditNote.posSale.customer?.name ||
                                            selectedCreditNote.posSale.customerName ||
                                            'Consumidor Final'}
                                    </span>
                                </div>
                                <div className={styles.detailRow}>
                                    <label>Total a Reembolsar:</label>
                                    <span
                                        style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.125rem' }}
                                    >
                                        {formatCurrency(selectedCreditNote.total)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.refundSection}>
                                <h3>Método de Reembolso</h3>
                                <div className={styles.refundMethods}>
                                    <button
                                        className={`${styles.refundMethodBtn} ${
                                            refundMethod === 'CASH' ? styles.active : ''
                                        }`}
                                        onClick={() => setRefundMethod('CASH')}
                                    >
                                        <div className={styles.icon}>💵</div>
                                        Efectivo
                                    </button>
                                    <button
                                        className={`${styles.refundMethodBtn} ${
                                            refundMethod === 'CARD' ? styles.active : ''
                                        }`}
                                        onClick={() => setRefundMethod('CARD')}
                                    >
                                        <div className={styles.icon}>💳</div>
                                        Tarjeta
                                    </button>
                                    <button
                                        className={`${styles.refundMethodBtn} ${
                                            refundMethod === 'TRANSFER' ? styles.active : ''
                                        }`}
                                        onClick={() => setRefundMethod('TRANSFER')}
                                    >
                                        <div className={styles.icon}>🏦</div>
                                        Transferencia
                                    </button>
                                </div>
                            </div>

                            {refundMethod !== 'CASH' && (
                                <div className={styles.formGroup}>
                                    <label>Referencia de Transacción</label>
                                    <input
                                        type="text"
                                        value={refundReference}
                                        onChange={(e) => setRefundReference(e.target.value)}
                                        placeholder="Número de autorización o referencia..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <Button
                                variant="secondary"
                                onClick={() => setShowRefundModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleProcessRefund} disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar Reembolso'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}