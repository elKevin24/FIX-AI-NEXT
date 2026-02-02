'use client';

import React from 'react';
import { useActionState } from 'react';
import { deleteUnavailability } from '@/lib/technician-actions';
import { Button } from '@/components/ui/Button';

// Simple table styles
const styles = {
    container: { overflowX: 'auto' as const },
    table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.875rem' },
    th: { textAlign: 'left' as const, padding: '0.75rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600 },
    td: { padding: '0.75rem', borderBottom: '1px solid #e2e8f0' },
    badge: { padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' },
    actions: { display: 'flex', gap: '0.5rem' }
};

const STATUS_COLORS: Record<string, string> = {
    ON_VACATION: '#dbeafe', // blue-100
    SICK_LEAVE: '#fee2e2', // red-100
    ON_LEAVE: '#fef3c7', // amber-100
    IN_TRAINING: '#f3e8ff', // purple-100
    UNAVAILABLE: '#f1f5f9', // slate-100
};

const STATUS_TEXT: Record<string, string> = {
    ON_VACATION: 'text-blue-800', 
    SICK_LEAVE: 'text-red-800', 
    ON_LEAVE: 'text-amber-800', 
    IN_TRAINING: 'text-purple-800', 
    UNAVAILABLE: 'text-slate-800', 
};

interface AvailabilityListProps {
    absences: Array<{
        id: string;
        reason: string;
        startDate: Date;
        endDate: Date;
        notes: string | null;
    }>;
    canEdit: boolean;
}

export default function AvailabilityList({ absences, canEdit }: AvailabilityListProps) {
    // We create a small component for the delete button to manage its own pending state
    const DeleteButton = ({ id }: { id: string }) => {
        const [state, action, isPending] = useActionState(deleteUnavailability, null);
        
        return (
            <form action={action}>
                <input type="hidden" name="id" value={id} />
                <Button variant="danger" size="sm" type="submit" isLoading={isPending}>
                    Eliminar
                </Button>
            </form>
        );
    };

    if (absences.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay ausencias registradas.</div>;
    }

    return (
        <div style={styles.container}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Motivo</th>
                        <th style={styles.th}>Desde</th>
                        <th style={styles.th}>Hasta</th>
                        <th style={styles.th}>Notas</th>
                        <th style={styles.th}>Estado</th>
                        {canEdit && <th style={styles.th}>Acciones</th>}
                    </tr>
                </thead>
                <tbody>
                    {absences.map((absence) => {
                        const now = new Date();
                        const isActive = absence.startDate <= now && absence.endDate >= now;
                        const isPast = absence.endDate < now;
                        
                        return (
                            <tr key={absence.id} style={{ opacity: isPast ? 0.6 : 1 }}>
                                <td style={styles.td}>
                                    <span style={{ 
                                        ...styles.badge, 
                                        backgroundColor: STATUS_COLORS[absence.reason] || '#f1f5f9',
                                        color: 'black' // Simple fallback, class names would be better
                                    }}>
                                        {absence.reason.replace('_', ' ')}
                                    </span>
                                </td>
                                <td style={styles.td}>{absence.startDate.toLocaleDateString()}</td>
                                <td style={styles.td}>{absence.endDate.toLocaleDateString()}</td>
                                <td style={styles.td}>{absence.notes || '-'}</td>
                                <td style={styles.td}>
                                    {isActive ? (
                                        <span style={{color: '#16a34a', fontWeight: 'bold'}}>● Activo</span>
                                    ) : isPast ? (
                                        <span style={{color: '#94a3b8'}}>Pasado</span>
                                    ) : (
                                        <span style={{color: '#ea580c'}}>Programado</span>
                                    )}
                                </td>
                                {canEdit && (
                                    <td style={styles.td}>
                                        {!isPast && <DeleteButton id={absence.id} />}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
