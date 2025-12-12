'use client';

import Link from 'next/link';

interface TicketWithTenant {
    id: string;
    title: string;
    description: string;
    status: string;
    priority?: string | null;
    deviceType?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    accessories?: string | null;
    checkInNotes?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    tenant: {
        id: string;
        name: string;
    };
    assignedTo?: {
        id: string;
        name: string | null;
        email: string;
    } | null;
}

const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
};

export default function TicketStatusCard({ ticket }: { ticket: TicketWithTenant }) {
    
    if (!ticket) {
        return <div style={{ padding: '16px', color: '#b91c1c', backgroundColor: '#fef2f2', borderRadius: '8px' }}>Error: No ticket data received</div>;
    }

    const getStatusStyle = (status: string) => {
        const baseStyle = { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
        switch(status) {
            case 'OPEN': return { ...baseStyle, color: '#1e40af', background: '#dbeafe', border: '1px solid #bfdbfe' };
            case 'IN_PROGRESS': return { ...baseStyle, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a' };
            case 'WAITING_FOR_PARTS': return { ...baseStyle, color: '#6b21a8', background: '#f3e8ff', border: '1px solid #e9d5ff' };
            case 'RESOLVED': return { ...baseStyle, color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0' };
            case 'CLOSED': return { ...baseStyle, color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb' };
            case 'CANCELLED': return { ...baseStyle, color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca' };
            default: return { ...baseStyle, color: '#374151', background: '#f3f4f6' };
        }
    };

    const displayStatus = ticket.status ? ticket.status.replace(/_/g, ' ') : 'UNKNOWN';
    const displayId = ticket.id ? ticket.id.split('-')[0] : '???';
    const tenantName = ticket.tenant?.name || 'Unknown Workshop';
    
    // Styles for theming
    const styles = {
        container: { maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
        card: { background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0' },
        header: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', gap: '16px' },
        titleGroup: { },
        titleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' },
        title: { fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: 1.2 }, // Slate 900
        metaRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }, // Slate 600
        grid: { borderBottom: '1px solid #f1f5f9' },
        cell: { padding: '16px 24px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
        cellLabel: { fontSize: '10px', textTransform: 'uppercase' as const, color: '#475569', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.05em' }, // Slate 600 (Was 500)
        cellValue: { fontSize: '14px', color: '#1e293b', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }, // Slate 800
        body: { padding: '24px' },
        sectionTitle: { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#475569', fontWeight: '700', marginBottom: '12px' }, // Slate 600 (Was 500)
        description: { fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: 0 }, // Slate 700
        extraSection: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f1f5f9', gap: '24px' },
        extraBox: { background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '13px', color: '#334155' },
        footer: { background: '#f8fafc', padding: '12px 24px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#475569' }, // Slate 600 (Was 500)
        link: { color: '#2563eb', textDecoration: 'none', transition: 'color 0.2s', fontWeight: '600' as const }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                
                <div style={styles.header} className="card-header">
                    <div style={styles.titleGroup}>
                        <div style={styles.titleRow}>
                            <h1 style={styles.title}>{ticket.title || 'Sin Título'}</h1>
                            <span style={getStatusStyle(ticket.status || 'OPEN')}>
                                {displayStatus}
                            </span>
                        </div>
                        <div style={styles.metaRow}>
                            <span>ID: <span style={{ color: '#475569' }}>{displayId}</span></span> {/* Slate 600 */}
                            <span>•</span>
                            <span>{tenantName}</span>
                        </div>
                    </div>

                    {ticket.priority && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                            <span style={{ color: ticket.priority === 'HIGH' ? '#ef4444' : '#3b82f6', fontSize: '8px' }}>●</span>
                            {ticket.priority} PRIORITY
                        </div>
                    )}
                </div>

                <div style={styles.grid} className="details-grid">
                    <div style={styles.cell} className="grid-cell">
                        <span style={styles.cellLabel}>Creado</span>
                        <span style={styles.cellValue}>{ticket.createdAt ? formatDate(ticket.createdAt) : '-'}</span>
                    </div>
                    <div style={styles.cell} className="grid-cell">
                        <span style={styles.cellLabel}>Actualizado</span>
                        <span style={styles.cellValue}>{ticket.updatedAt ? formatDate(ticket.updatedAt) : '-'}</span>
                    </div>
                    <div style={styles.cell} className="grid-cell">
                        <span style={styles.cellLabel}>Asignado a</span>
                        <span style={styles.cellValue}>{ticket.assignedTo?.name || 'Sin asignar'}</span>
                    </div>
                    <div style={styles.cell} className="grid-cell">
                        <span style={styles.cellLabel}>Modelo</span>
                        <span style={styles.cellValue}>{(ticket as any).deviceModel || 'N/A'}</span>
                    </div>
                </div>

                <div style={styles.body}>
                    <h3 style={styles.sectionTitle}>Detalle del Problema</h3>
                    <p style={styles.description}>
                        {ticket.description || 'Sin descripción disponible.'}
                    </p>

                    {((ticket as any).accessories || (ticket as any).checkInNotes) && (
                        <div style={styles.extraSection} className="extra-section">
                            {(ticket as any).accessories && (
                                <div>
                                    <h4 style={styles.sectionTitle}>Accesorios</h4>
                                    <div style={styles.extraBox}>
                                        {(ticket as any).accessories}
                                    </div>
                                </div>
                            )}
                            {(ticket as any).checkInNotes && (
                                <div>
                                    <h4 style={styles.sectionTitle}>Estado Físico</h4>
                                    <div style={styles.extraBox}>
                                        {(ticket as any).checkInNotes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={styles.footer} className="card-footer">
                    <span>FIX-AI TRACKER v2.0</span>
                    <Link href="/login" style={styles.link}>
                        Acceso Personal
                    </Link>
                </div>
            </div>

                        <style jsx>{`

                            .card-header {

                                display: flex;

                                flex-direction: column;

                                align-items: flex-start;

                            }

                            .details-grid {

                                display: grid;

                                grid-template-columns: repeat(2, 1fr);

                            }

                            .grid-cell {

                                border-bottom: 1px solid #f1f5f9;

                                border-right: 1px solid #f1f5f9;

                            }

                            .details-grid .grid-cell:nth-child(2n) {

                                border-right: none;

                            }

                             .details-grid .grid-cell:last-child,

                             .details-grid .grid-cell:nth-last-child(2):nth-child(odd) {

                                border-bottom: none;

                            }

                            .extra-section {

                                display: grid;

                                grid-template-columns: 1fr;

                            }

                            .card-footer {

                                display: flex;

                                flex-direction: column;

                                align-items: center;

                                gap: 8px;

                            }

            

                            @media (min-width: 768px) {

                                .card-header {

                                    flex-direction: column;

                                    align-items: flex-start;

                                }

                                .details-grid {

                                    grid-template-columns: repeat(2, 1fr);

                                }

                                .grid-cell {

                                    border-bottom: 1px solid #f1f5f9;

                                    border-right: 1px solid #f1f5f9;

                                }

                                .details-grid .grid-cell:nth-child(2n) {

                                    border-right: none;

                                }

                                .details-grid .grid-cell:last-child,

                                .details-grid .grid-cell:nth-last-child(2):nth-child(odd) {

                                    border-bottom: none;

                                }

                                .extra-section {

                                    grid-template-columns: 1fr;

                                }

                                .card-footer {

                                    flex-direction: column;

                                    align-items: center;

                                }

                            }

                        `}</style>

                    </div>

                );

            }

            