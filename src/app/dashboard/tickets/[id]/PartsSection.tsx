'use client';

import { useActionState, useState, useEffect } from 'react';
import { addPartToTicket, removePartFromTicket } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import styles from '../tickets.module.css';

interface Part {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    cost: any;
    price: any;
}

interface PartUsage {
    id: string;
    quantity: number;
    createdAt: Date;
    part: Part;
}

interface Props {
    ticketId: string;
    partsUsed: PartUsage[];
    availableParts: Part[];
}

export default function PartsSection({ ticketId, partsUsed, availableParts }: Props) {
    const router = useRouter();
    const [addState, addAction, isAdding] = useActionState(addPartToTicket, null);
    const [removeState, removeAction, isRemoving] = useActionState(removePartFromTicket, null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedPartId, setSelectedPartId] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Calculate total cost
    const totalCost = partsUsed.reduce((sum, usage) => {
        return sum + (Number(usage.part.cost) * usage.quantity);
    }, 0);

    const totalPrice = partsUsed.reduce((sum, usage) => {
        return sum + (Number(usage.part.price) * usage.quantity);
    }, 0);

    // Refresh on success
    useEffect(() => {
        if (addState?.success) {
            queueMicrotask(() => {
                setShowAddForm(false);
                setSelectedPartId('');
                setQuantity(1);
            });
            router.refresh();
        }
    }, [addState, router]);

    useEffect(() => {
        if (removeState?.success) {
            router.refresh();
        }
    }, [removeState, router]);

    const selectedPart = availableParts.find(p => p.id === selectedPartId);
    const maxQuantity = selectedPart?.quantity || 0;

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Repuestos Utilizados ({partsUsed.length})</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={showAddForm ? styles.cancelBtn : styles.createBtn}
                >
                    {showAddForm ? 'Cancelar' : '+ Agregar Repuesto'}
                </button>
            </div>

            {/* Add Part Form */}
            {showAddForm && (
                <form action={addAction} className={styles.inlineForm}>
                    <input type="hidden" name="ticketId" value={ticketId} />

                    <div className={styles.gridForm}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Repuesto</label>
                            <select
                                name="partId"
                                value={selectedPartId}
                                onChange={(e) => {
                                    setSelectedPartId(e.target.value);
                                    setQuantity(1);
                                }}
                                required
                                className={styles.select}
                            >
                                <option value="">Seleccionar repuesto...</option>
                                {availableParts.map(part => (
                                    <option key={part.id} value={part.id}>
                                        {part.name} {part.sku ? `(${part.sku})` : ''} - Stock: {part.quantity} - Q{Number(part.price).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cantidad</label>
                            <input
                                type="number"
                                name="quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                min="1"
                                max={maxQuantity}
                                required
                                disabled={!selectedPartId}
                                className={styles.input}
                            />
                            {selectedPartId && (
                                <p className={styles.textMuted} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    Disponible: {maxQuantity}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isAdding || !selectedPartId}
                            className={styles.createBtn}
                        >
                            {isAdding ? 'Agregando...' : 'Agregar'}
                        </button>
                    </div>

                    {addState?.message && !addState.success && (
                        <p className={styles.errorMessage}>
                            {addState.message}
                        </p>
                    )}
                </form>
            )}

            {/* Parts List */}
            {partsUsed.length === 0 ? (
                <div className={styles.emptyState}>
                    No se han agregado repuestos a esta reparación.
                </div>
            ) : (
                <>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHeaderRow}>
                                    <th>Repuesto</th>
                                    <th>SKU</th>
                                    <th style={{ textAlign: 'center' }}>Cant.</th>
                                    <th style={{ textAlign: 'right' }}>Costo U.</th>
                                    <th style={{ textAlign: 'right' }}>Precio U.</th>
                                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                                    <th style={{ textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partsUsed.map((usage) => {
                                    const subtotal = Number(usage.part.price) * usage.quantity;
                                    return (
                                        <tr key={usage.id} className={styles.tableRow}>
                                            <td><strong>{usage.part.name}</strong></td>
                                            <td className={styles.textMuted}>{usage.part.sku || '-'}</td>
                                            <td style={{ textAlign: 'center' }}><strong>{usage.quantity}</strong></td>
                                            <td style={{ textAlign: 'right' }}>Q{Number(usage.part.cost).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>Q{Number(usage.part.price).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}><strong>Q{subtotal.toFixed(2)}</strong></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <form action={removeAction}>
                                                    <input type="hidden" name="usageId" value={usage.id} />
                                                    <button
                                                        type="submit"
                                                        disabled={isRemoving}
                                                        className={styles.textDanger}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8125rem' }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Costo Total</span>
                            <span className={styles.summaryValue}>Q{totalCost.toFixed(2)}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Precio Venta</span>
                            <span className={`${styles.summaryValue} ${styles.textSuccess}`}>Q{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className={styles.summaryItem} style={{ gridColumn: 'span 2', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <span className={styles.summaryLabel}>Utilidad Estimada</span>
                            <span className={`${styles.summaryValue} ${totalPrice > totalCost ? styles.textSuccess : styles.textDanger}`}>
                                Q{(totalPrice - totalCost).toFixed(2)} ({totalCost > 0 ? ((totalPrice - totalCost) / totalCost * 100).toFixed(1) : '0'}%)
                            </span>
                        </div>
                    </div>
                </>
            )}

            {removeState?.message && !removeState.success && (
                <p className={styles.errorMessage}>
                    {removeState.message}
                </p>
            )}
        </div>
    );
}