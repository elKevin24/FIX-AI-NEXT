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
            // Defer state updates to avoid cascading renders
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

    // Get max quantity for selected part
    const selectedPart = availableParts.find(p => p.id === selectedPartId);
    const maxQuantity = selectedPart?.quantity || 0;

    return (
        <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Repuestos Utilizados ({partsUsed.length})</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={styles.createBtn}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    {showAddForm ? 'Cancelar' : '+ Agregar Repuesto'}
                </button>
            </div>

            {/* Add Part Form */}
            {showAddForm && (
                <form action={addAction} style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                }}>
                    <input type="hidden" name="ticketId" value={ticketId} />

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                Repuesto
                            </label>
                            <select
                                name="partId"
                                value={selectedPartId}
                                onChange={(e) => {
                                    setSelectedPartId(e.target.value);
                                    setQuantity(1);
                                }}
                                required
                                className="p-2 border rounded text-black w-full"
                            >
                                <option value="">Seleccionar repuesto...</option>
                                {availableParts.map(part => (
                                    <option key={part.id} value={part.id}>
                                        {part.name} {part.sku ? `(${part.sku})` : ''} - Stock: {part.quantity} - ${Number(part.price).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                Cantidad
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                min="1"
                                max={maxQuantity}
                                required
                                disabled={!selectedPartId}
                                className="p-2 border rounded text-black w-full"
                            />
                            {selectedPartId && (
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    Disponible: {maxQuantity}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isAdding || !selectedPartId}
                            className={styles.createBtn}
                            style={{ padding: '0.5rem 1rem' }}
                        >
                            {isAdding ? 'Agregando...' : 'Agregar'}
                        </button>
                    </div>

                    {addState?.message && !addState.success && (
                        <p style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                            {addState.message}
                        </p>
                    )}
                </form>
            )}

            {/* Parts List */}
            {partsUsed.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No se han agregado repuestos a esta reparación.
                </p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.875rem'
                        }}>
                            <thead>
                                <tr style={{
                                    backgroundColor: '#f9fafb',
                                    borderBottom: '2px solid #e5e7eb'
                                }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Repuesto</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>SKU</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Cantidad</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Costo Unit.</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Precio Unit.</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Subtotal</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partsUsed.map((usage) => {
                                    const subtotal = Number(usage.part.price) * usage.quantity;
                                    return (
                                        <tr key={usage.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '0.75rem' }}>{usage.part.name}</td>
                                            <td style={{ padding: '0.75rem', color: '#6b7280' }}>{usage.part.sku || '-'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>{usage.quantity}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>${Number(usage.part.cost).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>${Number(usage.part.price).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>${subtotal.toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <form action={removeAction} style={{ display: 'inline' }}>
                                                    <input type="hidden" name="usageId" value={usage.id} />
                                                    <button
                                                        type="submit"
                                                        disabled={isRemoving}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#dc2626',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            textDecoration: 'underline',
                                                        }}
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

                    {/* Totals */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        maxWidth: '400px',
                        marginLeft: 'auto',
                    }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Costo Total:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#374151' }}>${totalCost.toFixed(2)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Precio Total:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>${totalPrice.toFixed(2)}</p>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Margen:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: totalPrice > totalCost ? '#10b981' : '#dc2626' }}>
                                ${(totalPrice - totalCost).toFixed(2)} ({totalCost > 0 ? ((totalPrice - totalCost) / totalCost * 100).toFixed(1) : '0'}%)
                            </p>
                        </div>
                    </div>
                </>
            )}

            {removeState?.message && !removeState.success && (
                <p style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                    {removeState.message}
                </p>
            )}
        </div>
    );
}
