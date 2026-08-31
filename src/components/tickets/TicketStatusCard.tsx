'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui';
import styles from './TicketStatusCard.module.css';

interface TicketWithTenant {
    id: string;
    ticketNumber?: string | null;
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
        id?: string;
        name: string | null;
        email?: string | null;
    } | null;
}

const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    }).format(new Date(date));
};

const getStatusBadgeVariant = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gray' => {
    switch (status) {
        case 'OPEN':
            return 'info';
        case 'IN_PROGRESS':
            return 'primary';
        case 'WAITING_FOR_PARTS':
            return 'warning';
        case 'RESOLVED':
            return 'success';
        case 'CLOSED':
            return 'gray';
        case 'CANCELLED':
            return 'error';
        default:
            return 'gray';
    }
};

export default function TicketStatusCard({ ticket }: { ticket: TicketWithTenant }) {
    if (!ticket) {
        return (
            <div className={styles['container']}>
                <Badge variant="error">No se encontró información del ticket</Badge>
            </div>
        );
    }

    const displayStatus = ticket.status ? ticket.status.replace(/_/g, ' ') : 'DESCONOCIDO';
    const displayId = ticket.ticketNumber || (ticket.id ? ticket.id.split('-')[0] : '???');
    const tenantName = ticket.tenant?.name || 'FIX Workshop';

    return (
        <div className={styles['container']}>
            <div className={styles['card']}>
                <div className={styles['header']}>
                    <div className={styles['titleRow']}>
                        <h2 className={styles['title']}>{ticket.title || 'Sin Título'}</h2>
                        <Badge variant={getStatusBadgeVariant(ticket.status || 'OPEN')}>
                            {displayStatus}
                        </Badge>
                    </div>
                    <div className={styles['metaRow']}>
                        <span>Ticket: <strong>{displayId}</strong></span>
                        <span>•</span>
                        <span>{tenantName}</span>
                    </div>

                    {ticket.priority && (
                        <div className={styles['priorityBadge']}>
                            <span style={{ color: ticket.priority === 'HIGH' ? 'var(--color-error-600)' : 'var(--color-primary-600)' }}>●</span>
                            Prioridad: {ticket.priority}
                        </div>
                    )}
                </div>

                <div className={styles['grid']}>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Creado</span>
                        <span className={styles['cellValue']}>{ticket.createdAt ? formatDate(ticket.createdAt) : '-'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Actualizado</span>
                        <span className={styles['cellValue']}>{ticket.updatedAt ? formatDate(ticket.updatedAt) : '-'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Asignado a</span>
                        <span className={styles['cellValue']}>{ticket.assignedTo?.name || 'Sin asignar'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Modelo</span>
                        <span className={styles['cellValue']}>{ticket.deviceModel || 'N/A'}</span>
                    </div>
                </div>

                <div className={styles['body']}>
                    <h3 className={styles['sectionTitle']}>Detalle del Problema</h3>
                    <p className={styles['description']}>
                        {ticket.description || 'Sin descripción disponible.'}
                    </p>

                    {(ticket.accessories || ticket.checkInNotes) && (
                        <div className={styles['extraSection']}>
                            {ticket.accessories && (
                                <div>
                                    <h4 className={styles['sectionTitle']}>Accesorios</h4>
                                    <div className={styles['extraBox']}>
                                        {ticket.accessories}
                                    </div>
                                </div>
                            )}
                            {ticket.checkInNotes && (
                                <div>
                                    <h4 className={styles['sectionTitle']}>Estado Físico</h4>
                                    <div className={styles['extraBox']}>
                                        {ticket.checkInNotes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className={styles['footer']}>
                    <span>FIX Workshop Portal</span>
                    <Link href="/login" className={styles['link']}>
                        Acceso para Personal
                    </Link>
                </footer>
            </div>
        </div>
    );
}