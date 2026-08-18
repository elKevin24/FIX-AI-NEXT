'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
import PageHeader from '@/components/PageHeader';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export function ReturnsClient({ initialCreditNotes, stats }: Props) {
    const router = useRouter();
    const { addToast } = useToast();

    // State
    const [creditNotes] = useState(initialCreditNotes);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<CreditNoteStatus | ''>('');
    const [loading, setLoading] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');

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

    // Helpers
    const formatCurrency = (amount: number) => `Q${amount.toFixed(2)}`;
    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-GT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    const announce = (msg: string) => {
        setLiveMessage('');
        requestAnimationFrame(() => setLiveMessage(msg));
    };

    const getPaymentLabel = (method: PaymentMethod | null | undefined) => {
        if (!method) return 'Pendiente';
        const labels: Record<PaymentMethod, string> = {
            CASH: 'Efectivo',
            CARD: 'Tarjeta',
            TRANSFER: 'Transferencia',
            CHECK: 'Cheque',
            OTHER: 'Otro',
        };
        return labels[method];
    };

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
            announce(`Venta ${sale.saleNumber} seleccionada`);
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
            announce('Nota de crédito creada exitosamente');
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
            announce('Reembolso procesado exitosamente');
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
            announce('Nota de crédito cancelada');
        } catch (error) {
            addToast(
                error instanceof Error ? error.message : 'Error al cancelar',
                'ERROR'
            );
        } finally {
            setLoading(false);
        }
    };

    // Status badge
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

    return (
        <div className={styles['container']}>
            {/* Aria live region */}
            <div className={styles['srOnly']} aria-live="polite" aria-atomic="true">
                {liveMessage}
            </div>

            {/* Header */}
            <PageHeader
                title="Devoluciones y Notas de Crédito"
                subtitle="Gestión de devoluciones y reembolsos"
                actions={
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Nueva Devolución
                    </Button>
                }
            />

            {/* Stats */}
            <div className={styles['statsGrid']}>
                <div className={styles['statCard']}>
                    <h3>Total NC</h3>
                    <div className={styles['value']}>{stats.totalCreditNotes}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['warning']}`}>
                    <h3>Pendientes</h3>
                    <div className={styles['value']}>{stats.pendingCreditNotes}</div>
                </div>
                <div className={styles['statCard']}>
                    <h3>Procesadas (mes)</h3>
                    <div className={styles['value']}>{stats.processedThisMonth}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['error']}`}>
                    <h3>Total Reembolsado</h3>
                    <div className={styles['value']}>
                        {formatCurrency(stats.totalRefundedAmount)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles['filtersBar']}>
                <input
                    type="text"
                    placeholder="Buscar por número o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles['searchInput']}
                    aria-label="Buscar nota de crédito por número o cliente"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CreditNoteStatus | '')}
                    className={styles['filterSelect']}
                    aria-label="Filtrar por estado"
                >
                    <option value="">Todos los estados</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="PROCESSED">Procesada</option>
                    <option value="CANCELLED">Cancelada</option>
                </select>
            </div>

            {/* Table */}
            <div className={styles['tableContainer']}>
                <div className={styles['tableWrapper']}>
                    <table className={styles['table']}>
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
                                        <div className={styles['emptyState']}>
                                            <h3>No hay notas de crédito</h3>
                                            <p>Crea una nueva devolución para comenzar</p>
                                            <Button onClick={() => setShowCreateModal(true)}>
                                                + Nueva Devolución
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCreditNotes.map((cn) => (
                                    <tr key={cn.id}>
                                        <td>
                                            <span className={styles['creditNoteNumber']}>
                                                {cn.creditNoteNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles['saleInfo']}>
                                                <span className={styles['saleNumber']}>
                                                    {cn.posSale.saleNumber}
                                                </span>
                                                <span className={styles['customerName']}>
                                                    {cn.posSale.customerName || 'Consumidor Final'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles['reason']} title={cn.reason}>
                                                {cn.reason}
                                            </span>
                                        </td>
                                        <td className={styles['amount']}>
                                            -{formatCurrency(cn.total)}
                                        </td>
                                        <td>{getStatusBadge(cn.status)}</td>
                                        <td>{formatDate(cn.createdAt)}</td>
                                        <td>
                                            <div className={styles['actionsCell']}>
                                                <button
                                                    className={styles['actionBtn']}
                                                    onClick={() => handleViewDetail(cn)}
                                                    aria-label={`Ver nota de crédito ${cn.creditNoteNumber}`}
                                                >
                                                    Ver
                                                </button>
                                                {cn.status === 'PENDING' && (
                                                    <button
                                                        className={`${styles['actionBtn']} ${styles['primary']}`}
                                                        onClick={() => handleViewDetail(cn)}
                                                        aria-label={`Procesar nota de crédito ${cn.creditNoteNumber}`}
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
            </div>

            {/* ===== CREATE MODAL ===== */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); resetForm(); }}
                title="Nueva Devolución"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => { setShowCreateModal(false); resetForm(); }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateCreditNote}
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
                        <h3>Buscar Venta Original</h3>
                        <input
                            type="text"
                            placeholder="Buscar por número de venta o cliente..."
                            value={saleSearch}
                            onChange={(e) => handleSaleSearch(e.target.value)}
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
                                        onClick={() => handleSelectSale(sale.id)}
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
                            <h3>
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
                            </h3>
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
                            <h3>Productos a Devolver</h3>
                            <table className={styles['itemsTable']}>
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
                                        <tr key={item.partId}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    onChange={() =>
                                                        toggleItemSelection(item.partId)
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
                                                        updateReturnQuantity(
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

            {/* ===== DETAIL MODAL ===== */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={selectedCreditNote ? `Nota de Crédito ${selectedCreditNote.creditNoteNumber}` : ''}
                size="lg"
                footer={
                    <>
                        {selectedCreditNote?.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="danger"
                                    onClick={() =>
                                        handleCancelCreditNote(selectedCreditNote.id)
                                    }
                                    disabled={loading}
                                    isLoading={loading}
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
                    </>
                }
            >
                {selectedCreditNote && (
                    <>
                        <div className={styles['detailGrid']}>
                            <div className={styles['detailSection']}>
                                <h3>Información</h3>
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
                                <h3>Reembolso</h3>
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
                            <h3>Motivo</h3>
                            <p>{selectedCreditNote.reason}</p>
                        </div>

                        {/* Items */}
                        <div className={styles['itemsSection']}>
                            <h3>Productos Devueltos</h3>
                            <table className={styles['itemsTable']}>
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
                                <h3>Notas</h3>
                                <p>{selectedCreditNote.notes}</p>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* ===== REFUND MODAL ===== */}
            <Modal
                isOpen={showRefundModal}
                onClose={() => setShowRefundModal(false)}
                title="Procesar Reembolso"
                size="md"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setShowRefundModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleProcessRefund}
                            disabled={loading}
                            isLoading={loading}
                        >
                            Confirmar Reembolso
                        </Button>
                    </>
                }
            >
                {selectedCreditNote && (
                    <>
                        <div className={styles['detailSection']}>
                            <h3>Nota de Crédito</h3>
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
                            <h3>Método de Reembolso</h3>
                            <div className={styles['refundMethods']}>
                                {(['CASH', 'CARD', 'TRANSFER'] as PaymentMethod[]).map(
                                    (method) => (
                                        <button
                                            key={method}
                                            className={`${styles['refundMethodBtn']} ${
                                                refundMethod === method
                                                    ? styles['active']
                                                    : ''
                                            }`}
                                            onClick={() => setRefundMethod(method)}
                                            aria-pressed={refundMethod === method}
                                            aria-label={`Seleccionar método: ${getPaymentLabel(method)}`}
                                        >
                                            {getPaymentLabel(method)}
                                        </button>
                                    )
                                )}
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
                    </>
                )}
            </Modal>
        </div>
    );
}
