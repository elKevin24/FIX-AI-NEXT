'use client';

import Link from 'next/link';
import { formatDateTime as formatDate } from '@/lib/utils';
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
        id: string;
        name: string | null;
        email: string;
    } | null;
}

export default function TicketStatusCard({ ticket }: { ticket: TicketWithTenant }) {
    if (!ticket) {
        return (
            <div style={{ padding: '16px', color: '#b91c1c', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                Error: No se recibió información del ticket
            </div>
        );
    }

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'OPEN':
                return `${styles['statusBadge']} ${styles['statusOpen']}`;
            case 'IN_PROGRESS':
                return `${styles['statusBadge']} ${styles['statusInProgress']}`;
            case 'WAITING_FOR_PARTS':
                return `${styles['statusBadge']} ${styles['statusWaitingForParts']}`;
            case 'WAITING_APPROVAL':
                return `${styles['statusBadge']} ${styles['statusWaitingApproval']}`;
            case 'RESOLVED':
                return `${styles['statusBadge']} ${styles['statusResolved']}`;
            case 'CLOSED':
                return `${styles['statusBadge']} ${styles['statusClosed']}`;
            case 'CANCELLED':
            case 'REJECTED':
                return `${styles['statusBadge']} ${styles['statusCancelled']}`;
            default:
                return `${styles['statusBadge']} ${styles['statusClosed']}`;
        }
    };

    const displayStatus = ticket.status ? ticket.status.replace(/_/g, ' ') : 'DESCONOCIDO';
    const displayId = ticket.ticketNumber || (ticket.id ? ticket.id.split('-')[0] : '???');
    const tenantName = ticket.tenant?.name || 'Taller de Servicio';
    const isHighPriority = ticket.priority === 'HIGH' || ticket.priority === 'URGENT';

    return (
        <div className={styles['container']}>
            <div className={styles['card']}>
                {/* Header */}
                <div className={styles['header']}>
                    <div>
                        <div className={styles['titleRow']}>
                            <h1 className={styles['title']}>{ticket.title || 'Orden de Servicio'}</h1>
                            <span className={getStatusClass(ticket.status || 'OPEN')}>
                                {displayStatus}
                            </span>
                        </div>
                        <div className={styles['metaRow']}>
                            <span>Orden: <strong>#{displayId}</strong></span>
                            <span>•</span>
                            <span>{tenantName}</span>
                        </div>
                    </div>

                    {ticket.priority && (
                        <div className={styles['priorityBadge']}>
                            <span
                                className={`${styles['priorityDot']} ${
                                    isHighPriority ? styles['priorityHigh'] : styles['priorityNormal']
                                }`}
                                aria-hidden="true"
                            />
                            <span>Prioridad {ticket.priority}</span>
                        </div>
                    )}
                </div>

                {/* Grid Details */}
                <div className={styles['grid']}>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Fecha de Ingreso</span>
                        <span className={styles['cellValue']}>{ticket.createdAt ? formatDate(ticket.createdAt) : '-'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Última Actualización</span>
                        <span className={styles['cellValue']}>{ticket.updatedAt ? formatDate(ticket.updatedAt) : '-'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Técnico Asignado</span>
                        <span className={styles['cellValue']}>{ticket.assignedTo?.name || 'En asignación'}</span>
                    </div>
                    <div className={styles['cell']}>
                        <span className={styles['cellLabel']}>Equipo / Modelo</span>
                        <span className={styles['cellValue']}>
                            {ticket.deviceType ? `${ticket.deviceType} ${ticket.deviceModel || ''}` : ticket.deviceModel || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className={styles['body']}>
                    <h3 className={styles['sectionTitle']}>Diagnóstico / Descripción del Problema</h3>
                    <p className={styles['description']}>
                        {ticket.description || 'Sin descripción detallada registrada.'}
                    </p>

                    {(ticket.accessories || ticket.checkInNotes) && (
                        <div className={styles['extraSection']}>
                            {ticket.accessories && (
                                <div>
                                    <h4 className={styles['sectionTitle']}>Accesorios Recibidos</h4>
                                    <div className={styles['extraBox']}>
                                        {ticket.accessories}
                                    </div>
                                </div>
                            )}
                            {ticket.checkInNotes && (
                                <div>
                                    <h4 className={styles['sectionTitle']}>Estado Físico / Observaciones</h4>
                                    <div className={styles['extraBox']}>
                                        {ticket.checkInNotes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles['footer']}>
                    <span>FIX-AI Workshop Tracker</span>
                    <Link href="/login" className={styles['link']}>
                        Acceso para Personal
                    </Link>
                </div>
            </div>
        </div>
    );
}