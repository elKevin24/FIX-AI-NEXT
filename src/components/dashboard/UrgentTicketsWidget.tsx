'use client';

import Link from 'next/link';
import styles from './UrgentTicketsWidget.module.css';

interface Ticket {
    id: string;
    title: string;
    priority: string | null;
    status: string;
    customer: {
        name: string;
    };
    createdAt: Date;
}

interface Props {
    tickets: Ticket[];
}

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'OPEN': 'Abierto',
        'IN_PROGRESS': 'En Progreso',
        'WAITING_FOR_PARTS': 'Esperando Repuestos',
        'RESOLVED': 'Resuelto',
        'CLOSED': 'Cerrado',
    };
    return labels[status] || status;
};

const getPriorityColor = (priority: string | null) => {
    if (!priority) return '#9ca3af';
    const colors: Record<string, string> = {
        'URGENT': '#dc2626',
        'HIGH': '#f59e0b',
        'MEDIUM': '#3b82f6',
        'LOW': '#6b7280',
    };
    return colors[priority] || '#9ca3af';
};

export default function UrgentTicketsWidget({ tickets }: Props) {
    if (tickets.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>✓</span>
                    <p className={styles.emptyText}>No hay tickets urgentes</p>
                    <p className={styles.emptySubtext}>¡Excelente trabajo!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.ticketList}>
                {tickets.map((ticket) => {
                    const daysOld = Math.floor(
                        (new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                        <Link
                            key={ticket.id}
                            href={`/dashboard/tickets/${ticket.id}`}
                            className={styles.ticketCard}
                        >
                            <div className={styles.ticketHeader}>
                                <div className={styles.ticketInfo}>
                                    <h4 className={styles.ticketTitle}>{ticket.title}</h4>
                                    <p className={styles.ticketCustomer}>{ticket.customer.name}</p>
                                </div>
                                <div
                                    className={styles.priorityBadge}
                                    style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                                >
                                    {ticket.priority || 'SIN DEFINIR'}
                                </div>
                            </div>
                            <div className={styles.ticketFooter}>
                                <span className={styles.ticketStatus}>
                                    {getStatusLabel(ticket.status)}
                                </span>
                                <span className={styles.ticketAge}>
                                    {daysOld === 0 ? 'Hoy' : `${daysOld} día${daysOld !== 1 ? 's' : ''}`}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
