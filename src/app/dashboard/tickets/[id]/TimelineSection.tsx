'use client';

import { TimelineEvent } from '@/lib/timeline';
import styles from '../tickets.module.css';

interface Props {
    events: TimelineEvent[];
}

export default function TimelineSection({ events }: Props) {
    const getEventStyles = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'NOTE':
                return {
                    bg: '#f9f9f9',
                    border: '#eee',
                    text: '#333',
                    badgeBg: '#e5e7eb',
                    badgeText: '#374151',
                    label: 'Nota'
                };
            case 'STATUS_CHANGE':
                return {
                    bg: '#f0fdf4', // Green-50
                    border: '#bbf7d0', // Green-200
                    text: '#166534', // Green-800
                    badgeBg: '#16a34a',
                    badgeText: 'white',
                    label: 'Cambio de Estado'
                };
            case 'INVENTORY_MOVEMENT':
                return {
                    bg: '#fff7ed', // Orange-50
                    border: '#fed7aa', // Orange-200
                    text: '#9a3412', // Orange-800
                    badgeBg: '#f97316',
                    badgeText: 'white',
                    label: 'Inventario'
                };
            case 'LOG':
            default:
                return {
                    bg: '#f0f9ff', // Sky-50
                    border: '#bae6fd', // Sky-200
                    text: '#0369a1', // Sky-700
                    badgeBg: '#0ea5e9',
                    badgeText: 'white',
                    label: 'Sistema'
                };
        }
    };

    return (
        <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Bitácora de Reparación y Auditoría ({events.length} eventos)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                        No hay eventos registrados.
                    </p>
                ) : (
                    events.map((event) => {
                        const style = getEventStyles(event.type);
                        return (
                            <div
                                key={event.id}
                                style={{
                                    padding: '1rem',
                                    backgroundColor: style.bg,
                                    borderRadius: '8px',
                                    border: `1px solid ${style.border}`,
                                    position: 'relative',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ 
                                            fontWeight: '600', 
                                            color: style.text,
                                            fontSize: '0.9rem'
                                        }}>
                                            {event.author.name || event.author.email || 'Sistema'}
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            backgroundColor: style.badgeBg,
                                            color: style.badgeText,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                            fontWeight: '600'
                                        }}>
                                            {style.label}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#999' }}>
                                            {new Date(event.date).toLocaleString('es-ES')}
                                        </span>
                                    </div>
                                </div>
                                <p style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    lineHeight: '1.5', 
                                    color: event.type === 'NOTE' ? '#444' : style.text,
                                    fontSize: '0.95rem'
                                }}>
                                    {event.content}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
