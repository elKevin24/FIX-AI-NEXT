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

    const totalLaborCost = servicesUsed.reduce((sum, service) => {
        return sum + Number(service.laborCost);
    }, 0);

    useEffect(() => {
        if (addState?.success) {
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
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Servicios y Mano de Obra ({servicesUsed.length})</h3>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={showAddForm ? styles.cancelBtn : styles.createBtn}
                >
                    {showAddForm ? 'Cancelar' : '+ Agregar Servicio'}
                </button>
            </div>

            {/* Add Service Form */}
            {showAddForm && (
                <form action={addAction} className={styles.inlineForm}>
                    <input type="hidden" name="ticketId" value={ticketId} />

                    <div className={styles.gridForm} style={{ gridTemplateColumns: '1fr auto' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Servicio / Labor</label>
                            <select
                                name="serviceId"
                                value={selectedServiceId}
                                onChange={(e) => setSelectedServiceId(e.target.value)}
                                required
                                className={styles.select}
                            >
                                <option value="">Seleccionar servicio...</option>
                                {availableServices.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - Q{Number(service.laborCost).toFixed(2)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isAdding || !selectedServiceId}
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

            {/* Services List */}
            {servicesUsed.length === 0 ? (
                <div className={styles.emptyState}>
                    No hay cargos de mano de obra registrados.
                </div>
            ) : (
                <>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHeaderRow}>
                                    <th>Descripción del Servicio</th>
                                    <th>Fecha Registro</th>
                                    <th style={{ textAlign: 'right' }}>Costo Labor</th>
                                    <th style={{ textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {servicesUsed.map((usage) => (
                                    <tr key={usage.id} className={styles.tableRow}>
                                        <td><strong>{usage.name}</strong></td>
                                        <td className={styles.textMuted}>{new Date(usage.createdAt).toLocaleDateString()}</td>
                                        <td style={{ textAlign: 'right' }}><strong>Q{Number(usage.laborCost).toFixed(2)}</strong></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <form action={removeAction}>
                                                <input type="hidden" name="serviceUsageId" value={usage.id} />
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
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Labor */}
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryItem} style={{ gridColumn: 'span 2' }}>
                            <span className={styles.summaryLabel}>Total Mano de Obra</span>
                            <span className={`${styles.summaryValue} ${styles.textInfo}`}>Q{totalLaborCost.toFixed(2)}</span>
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