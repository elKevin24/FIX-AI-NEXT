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
import { formatCurrency } from '@/lib/utils';
import styles from './returns.module.css';
import PageHeader from '@/components/PageHeader';
import {
    ReturnsProps,
    SaleSearchResult,
    SaleForReturn,
    CreditNoteDetail,
    ReturnItem,
} from './types';
import { CreateReturnModal } from './components/CreateReturnModal';
import { CreditNoteDetailModal } from './components/CreditNoteDetailModal';
import { CreditNoteRefundModal } from './components/CreditNoteRefundModal';

export function ReturnsClient({ initialCreditNotes, stats }: ReturnsProps) {
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
        } catch {
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
            { variant: 'success' | 'warning' | 'error' | 'gray'; label: string }
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
                title="Notas de Crédito y Devoluciones"
                subtitle="Gestión de devoluciones y reembolsos de ventas"
                actions={
                    <Button onClick={() => setShowCreateModal(true)}>
                        + Nueva Devolución
                    </Button>
                }
            />

            {/* Stats */}
            <div className={styles['statsGrid']}>
                <div className={styles['statCard']}>
                    <h2>Total Notas de Crédito</h2>
                    <div className={styles['value']}>{stats.totalCreditNotes}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['warning']}`}>
                    <h2>Pendientes de Reembolso</h2>
                    <div className={styles['value']}>{stats.pendingCreditNotes}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['success']}`}>
                    <h2>Procesadas este Mes</h2>
                    <div className={styles['value']}>{stats.processedThisMonth}</div>
                </div>
                <div className={`${styles['statCard']} ${styles['info']}`}>
                    <h2>Total Reembolsado</h2>
                    <div className={styles['value']}>
                        {formatCurrency(stats.totalRefundedAmount)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles['filtersBar']}>
                <input
                    type="text"
                    placeholder="Buscar por número de NC, venta o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles['searchInput']}
                    aria-label="Buscar por número de nota de crédito, venta o cliente"
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
                      <caption className="sr-only">Listado de notas de crédito</caption>
                        <thead>
                            <tr>
                                <th scope="col">Nota de Crédito</th>
                                <th scope="col">Venta Original</th>
                                <th scope="col">Cliente</th>
                                <th scope="col">Total</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Método Reembolso</th>
                                <th scope="col">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCreditNotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className={styles['emptyState']}>
                                            <h2>No hay notas de crédito</h2>
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
                                            <div className={styles['dateInfo']}>
                                                <span className={styles['dateLabel']}>
                                                    {formatDate(cn.createdAt)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles['saleNumber']}>
                                                {cn.posSale.saleNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles['customerName']}>
                                                {cn.posSale.customerName || 'Consumidor Final'}
                                            </span>
                                        </td>
                                        <td className={styles['amount']}>
                                            {formatCurrency(cn.total)}
                                        </td>
                                        <td>{getStatusBadge(cn.status)}</td>
                                        <td>
                                            <span className={styles['paymentMethod']}>
                                                {getPaymentLabel(cn.refundMethod)}
                                            </span>
                                        </td>
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
                                                        className={`${styles['actionBtn']} ${styles['success']}`}
                                                        onClick={() => handleViewDetail(cn)}
                                                        aria-label={`Reembolsar nota de crédito ${cn.creditNoteNumber}`}
                                                    >
                                                        Reembolsar
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

            {/* Sub-Modals */}
            <CreateReturnModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                loading={loading}
                selectedSale={selectedSale}
                setSelectedSale={setSelectedSale}
                saleSearch={saleSearch}
                onSaleSearch={handleSaleSearch}
                saleSearchResults={saleSearchResults}
                onSelectSale={handleSelectSale}
                returnItems={returnItems}
                setReturnItems={setReturnItems}
                onToggleItemSelection={toggleItemSelection}
                onUpdateReturnQuantity={updateReturnQuantity}
                subtotal={subtotal}
                taxAmount={taxAmount}
                total={total}
                returnReason={returnReason}
                setReturnReason={setReturnReason}
                returnNotes={returnNotes}
                setReturnNotes={setReturnNotes}
                onCreateCreditNote={handleCreateCreditNote}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

            <CreditNoteDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                selectedCreditNote={selectedCreditNote}
                loading={loading}
                onCancelCreditNote={handleCancelCreditNote}
                onOpenRefundModal={openRefundModal}
                getStatusBadge={getStatusBadge}
                getPaymentLabel={getPaymentLabel}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

            <CreditNoteRefundModal
                isOpen={showRefundModal}
                onClose={() => setShowRefundModal(false)}
                selectedCreditNote={selectedCreditNote}
                loading={loading}
                refundMethod={refundMethod}
                setRefundMethod={setRefundMethod}
                refundReference={refundReference}
                setRefundReference={setRefundReference}
                onProcessRefund={handleProcessRefund}
                getPaymentLabel={getPaymentLabel}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}
