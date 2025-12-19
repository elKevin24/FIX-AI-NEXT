'use client';

import { useActionState, useState, useEffect } from 'react';
import { addServiceToTicket, removeServiceFromTicket } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import styles from '../tickets.module.css';

interface Service {
    id: string;
    name: string;
    laborCost: any;
}

interface ServiceUsage {
    id: string;
    name: string;
    laborCost: any;
    createdAt: Date;
    serviceId: string;
}

interface Props {
    ticketId: string;
    servicesUsed: ServiceUsage[];
    availableServices: Service[];
}

export default function ServicesSection({ ticketId, servicesUsed, availableServices }: Props) {
    const router = useRouter();
    const [addState, addAction, isAdding] = useActionState(addServiceToTicket, null);
    const [removeState, removeAction, isRemoving] = useActionState(removeServiceFromTicket, null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');

    // Calculate total cost
    const totalLaborCost = servicesUsed.reduce((sum, usage) => {
        return sum + Number(usage.laborCost);
    }, 0);

    // Refresh on success
    useEffect(() => {
        if (addState?.success) {
            // Defer state updates to avoid cascading renders
            queueMicrotask(() => {
                setShowAddForm(false);
                setSelectedServiceId('');
            });
            router.refresh();
        }
    }, [addState, router]);

    useEffect(() => {
        if (removeState?.success) {
            router.refresh();
        }
    }, [removeState, router]);

    return (
        <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Servicios / Mano de Obra ({servicesUsed.length})</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={styles.createBtn}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    {showAddForm ? 'Cancelar' : '+ Agregar Servicio'}
                </button>
            </div>

            {/* Add Service Form */}
            {showAddForm && (
                <form action={addAction} style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                }}>
                    <input type="hidden" name="ticketId" value={ticketId} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                Servicio
                            </label>
                            <select
                                name="serviceId"
                                value={selectedServiceId}
                                onChange={(e) => setSelectedServiceId(e.target.value)}
                                required
                                className="p-2 border rounded text-black w-full"
                            >
                                <option value="">Seleccionar servicio...</option>
                                {availableServices.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - ${Number(service.laborCost).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isAdding || !selectedServiceId}
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

            {/* Services List */}
            {servicesUsed.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No se han agregado servicios a esta reparación.
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
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Servicio</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Costo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servicesUsed.map((usage) => (
                                    <tr key={usage.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '0.75rem' }}>{usage.name}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>${Number(usage.laborCost).toFixed(2)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <form action={removeAction} style={{ display: 'inline' }}>
                                                <input type="hidden" name="serviceUsageId" value={usage.id} />
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
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        maxWidth: '400px',
                        marginLeft: 'auto',
                    }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Mano de Obra:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>${totalLaborCost.toFixed(2)}</p>
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
