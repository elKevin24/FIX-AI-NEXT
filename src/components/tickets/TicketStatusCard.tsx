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
    
    // DEBUG: Ver qué llega realmente
    // console.log("Ticket Data en Card:", ticket);

    if (!ticket) {
        return <div style={{ padding: '16px', color: '#ef4444', backgroundColor: '#fee2e2', borderRadius: '8px' }}>Error: No ticket data received</div>;
    }

    // Status Colors (CSS Variables simulated in JS - LIGHT THEME)
    const getStatusStyle = (status: string) => {
        const baseStyle = { padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
        switch(status) {
            case 'OPEN': return { ...baseStyle, color: '#2563eb', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }; // Blue
            case 'IN_PROGRESS': return { ...baseStyle, color: '#d97706', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }; // Amber
            case 'WAITING_FOR_PARTS': return { ...baseStyle, color: '#9333ea', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }; // Purple
            case 'RESOLVED': return { ...baseStyle, color: '#16a34a', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }; // Green
            case 'CLOSED': return { ...baseStyle, color: '#4b5563', background: 'rgba(107, 114, 128, 0.1)', border: '1px solid rgba(107, 114, 128, 0.2)' }; // Gray
            case 'CANCELLED': return { ...baseStyle, color: '#dc2626', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }; // Red
            default: return { ...baseStyle, color: '#4b5563', background: 'rgba(107, 114, 128, 0.1)' };
        }
    };

    const displayStatus = ticket.status ? ticket.status.replace(/_/g, ' ') : 'UNKNOWN';
    const displayId = ticket.id ? ticket.id.split('-')[0] : '???';
    const tenantName = ticket.tenant?.name || 'Unknown Workshop';
    
    // Styles (LIGHT THEME)
    const styles = {
        container: { maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
        card: { background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }, // Light background, subtle shadow
        header: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' },
        titleGroup: { },
        titleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' },
        title: { fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: 0, lineHeight: 1.2 }, // Dark text
        metaRow: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#718096', fontFamily: 'monospace' }, // Gray text
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderBottom: '1px solid #e2e8f0' },
        cell: { padding: '16px 24px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' },
        cellLabel: { fontSize: '10px', textTransform: 'uppercase' as const, color: '#718096', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.05em' }, // Gray label
        cellValue: { fontSize: '14px', color: '#1a202c', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }, // Dark text
        body: { padding: '24px' },
        sectionTitle: { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#718096', fontWeight: '700', marginBottom: '12px' }, // Gray title
        description: { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: 0 }, // Darker gray
        extraSection: { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
        extraBox: { background: '#f7fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#4a5568' }, // Light background for extra info
        footer: { background: '#f7fafc', padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#718096' }, // Light footer
        link: { color: '#4299e1', textDecoration: 'none', transition: 'color 0.2s' } // Blue link
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.titleGroup}>
                        <div style={styles.titleRow}>
                            <h1 style={styles.title}>{ticket.title || 'Sin Título'}</h1>
                            <span style={getStatusStyle(ticket.status || 'OPEN')}>
                                {displayStatus}
                            </span>
                        </div>
                        <div style={styles.metaRow}>
                            <span>ID: <span style={{ color: '#718096' }}>{displayId}</span></span>
                            <span>•</span>
                            <span>{tenantName}</span>
                        </div>
                    </div>

                    {/* Priority Badge */}
                    {ticket.priority && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '500', color: '#718096', background: '#f7fafc', padding: '4px 10px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
                            <span style={{ color: ticket.priority === 'HIGH' ? '#ef4444' : '#3b82f6', fontSize: '8px' }}>●</span>
                            {ticket.priority} PRIORITY
                        </div>
                    )}
                </div>

                {/* Grid */}
                <div style={styles.grid}>
                    <div style={styles.cell}>
                        <span style={styles.cellLabel}>Creado</span>
                        <span style={styles.cellValue}>{ticket.createdAt ? formatDate(ticket.createdAt) : '-'}</span>
                    </div>
                    <div style={styles.cell}>
                        <span style={styles.cellLabel}>Actualizado</span>
                        <span style={styles.cellValue}>{ticket.updatedAt ? formatDate(ticket.updatedAt) : '-'}</span>
                    </div>
                    <div style={styles.cell}>
                        <span style={styles.cellLabel}>Asignado a</span>
                        <span style={styles.cellValue}>{ticket.assignedTo?.name || 'Sin asignar'}</span>
                    </div>
                    <div style={{ ...styles.cell, borderRight: 'none' }}>
                        <span style={styles.cellLabel}>Modelo</span>
                        <span style={styles.cellValue}>{(ticket as any).deviceModel || 'N/A'}</span>
                    </div>
                </div>

                {/* Body */}
                <div style={styles.body}>
                    <h3 style={styles.sectionTitle}>Detalle del Problema</h3>
                    <p style={styles.description}>
                        {ticket.description || 'Sin descripción disponible.'}
                    </p>

                    {/* V2 Extras */}
                    {((ticket as any).accessories || (ticket as any).checkInNotes) && (
                        <div style={styles.extraSection}>
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

                {/* Footer */}
                <div style={styles.footer}>
                    <span>FIX-AI TRACKER v2.0</span>
                    <Link href="/login" style={styles.link}>
                        Acceso Personal
                    </Link>
                </div>
            </div>
        </div>
    );
}