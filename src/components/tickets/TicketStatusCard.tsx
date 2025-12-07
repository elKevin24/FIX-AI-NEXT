import Link from 'next/link';
import { Ticket, Tenant, User } from '@prisma/client';
import { Badge } from '@/components/ui';
import styles from './TicketStatusCard.module.css';

interface TicketWithTenant extends Ticket {
    tenant: Tenant;
    assignedTo?: User | null;
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return dateTimeFormatter.format(d);
};

const getRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'Ahora mismo';
};

export default function TicketStatusCard({ ticket }: { ticket: TicketWithTenant }) {
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary', label: string, icon: string }> = {
            'OPEN': { variant: 'info', label: 'Abierto', icon: '🔵' },
            'IN_PROGRESS': { variant: 'warning', label: 'En Progreso', icon: '⚡' },
            'RESOLVED': { variant: 'success', label: 'Resuelto', icon: '✓' },
            'CLOSED': { variant: 'default', label: 'Cerrado', icon: '✓' },
        };
        return statusMap[status] || { variant: 'default' as const, label: status, icon: '•' };
    };

    const getPriorityBadge = (priority: string) => {
        const priorityMap: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default' | 'primary', icon: string, label: string }> = {
            'LOW': { variant: 'success', icon: '↓', label: 'Baja' },
            'MEDIUM': { variant: 'warning', icon: '→', label: 'Media' },
            'HIGH': { variant: 'error', icon: '↑', label: 'Alta' },
            'URGENT': { variant: 'error', icon: '⚠', label: 'Urgente' },
        };
        return priorityMap[priority] || { variant: 'default' as const, icon: '•', label: priority };
    };

    const statusInfo = getStatusBadge(ticket.status);
    const priorityInfo = getPriorityBadge(ticket.priority || 'LOW');

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                {/* Back Button */}
                <Link href="/tickets/status" className={styles.backButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Consultar Otro Ticket</span>
                </Link>

                {/* Main Card */}
                <div className={styles.mainCard}>
                    {/* Header Section */}
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <div className={styles.headerTop}>
                                <div className={styles.iconContainer}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div className={styles.titleSection}>
                                    <p className={styles.tenantName}>
                                        {ticket.tenant.name}
                                    </p>
                                    <h1 className={styles.ticketTitle}>
                                        {ticket.title}
                                    </h1>
                                </div>
                            </div>

                            <div className={styles.badgesContainer}>
                                <div className={styles.statusBadge}>
                                    <span>{statusInfo.icon}</span>
                                    <span>{statusInfo.label}</span>
                                </div>
                                <div className={styles.statusBadge}>
                                    <span>{priorityInfo.icon}</span>
                                    <span>{priorityInfo.label}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className={styles.content}>
                        {/* Ticket ID */}
                        <div className={styles.ticketIdCard}>
                            <p className={styles.ticketIdLabel}>
                                ID del Ticket
                            </p>
                            <p className={styles.ticketIdValue}>
                                {ticket.id}
                            </p>
                        </div>

                        {/* Description */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Descripción
                            </h3>
                            <p className={styles.description}>
                                {ticket.description}
                            </p>
                        </div>

                        {/* Info Grid */}
                        <div className={styles.infoGrid}>
                            {/* Assigned To */}
                            {ticket.assignedTo && (
                                <div className={styles.infoCard}>
                                    <div className={styles.infoCardHeader}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-700)" strokeWidth="2">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <p className={styles.infoCardLabel}>
                                            Asignado a
                                        </p>
                                    </div>
                                    <p className={styles.infoCardValue}>
                                        {ticket.assignedTo.name || ticket.assignedTo.email}
                                    </p>
                                </div>
                            )}

                            {/* Created */}
                            <div className={styles.infoCard}>
                                <div className={styles.infoCardHeader}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-700)" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 6v6l4 2" />
                                    </svg>
                                    <p className={styles.infoCardLabel}>
                                        Creado
                                    </p>
                                </div>
                                <p className={styles.infoCardSecondary}>
                                    {formatDate(ticket.createdAt)}
                                </p>
                                <p className={styles.infoCardTertiary}>
                                    {getRelativeTime(ticket.createdAt)}
                                </p>
                            </div>

                            {/* Last Updated */}
                            <div className={styles.infoCard}>
                                <div className={styles.infoCardHeader}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-700)" strokeWidth="2">
                                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <p className={styles.infoCardLabel}>
                                        Última Actualización
                                    </p>
                                </div>
                                <p className={styles.infoCardSecondary}>
                                    {formatDate(ticket.updatedAt)}
                                </p>
                                <p className={styles.infoCardTertiary}>
                                    {getRelativeTime(ticket.updatedAt)}
                                </p>
                            </div>
                        </div>

                        {/* Status Help */}
                        <div className={styles.helpAlert}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info-600)" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4m0-4h.01" />
                            </svg>
                            <p className={styles.helpAlertText}>
                                <strong>¿Necesitas ayuda?</strong><br/>
                                Si tienes preguntas sobre tu ticket, por favor contacta a nuestro equipo de soporte con el ID de tu ticket.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
