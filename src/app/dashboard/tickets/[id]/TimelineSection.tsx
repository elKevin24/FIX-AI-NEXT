'use client';

import { TimelineEvent } from '@/lib/timeline';
import styles from '../tickets.module.css';

interface Props {
    events: TimelineEvent[];
}

export default function TimelineSection({ events }: Props) {
    return (
        <div className={styles.tableContainer} style={{ padding: '2rem', marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Bitácora de Reparación y Auditoría ({events.length} eventos)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                        No hay eventos registrados.
                    </p>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            style={{
                                padding: '1rem',
                                backgroundColor: event.type === 'NOTE' ? '#f9f9f9' : '#f0f9ff',
                                borderRadius: '8px',
                                border: event.type === 'NOTE' ? '1px solid #eee' : '1px solid #bae6fd',
                                position: 'relative',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: event.type === 'NOTE' ? '#333' : '#0369a1',
                                        fontSize: '0.9rem'
                                    }}>
                                        {event.author.name || event.author.email || 'Sistema'}
                                    </span>
                                    {event.type === 'LOG' && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            backgroundColor: '#0ea5e9',
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>
                                            Sistema
                                        </span>
                                    )}
                                    <span style={{ fontSize: '0.8rem', color: '#999' }}>
                                        {new Date(event.date).toLocaleString('es-ES')}
                                    </span>
                                </div>
                            </div>
                            <p style={{ 
                                whiteSpace: 'pre-wrap', 
                                lineHeight: '1.5', 
                                color: event.type === 'NOTE' ? '#444' : '#0c4a6e',
                                fontSize: '0.95rem'
                            }}>
                                {event.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
