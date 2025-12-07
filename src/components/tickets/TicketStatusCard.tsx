'use client';

import Link from 'next/link';
import { Ticket, Tenant, User } from '@prisma/client';

interface TicketWithTenant extends Ticket {
    tenant: Tenant;
    assignedTo?: User | null;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
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

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
};

export default function TicketStatusCard({ ticket, onBack }: { ticket: TicketWithTenant, onBack?: () => void }) {
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string, icon: string }> = {
            'OPEN': { label: 'Open', icon: '🔵' },
            'IN_PROGRESS': { label: 'In Progress', icon: '⚡' },
            'RESOLVED': { label: 'Resolved', icon: '✓' },
            'CLOSED': { label: 'Closed', icon: '✓' },
        };
        return statusMap[status] || { label: status, icon: '•' };
    };

    const getPriorityBadge = (priority: string) => {
        const priorityMap: Record<string, { icon: string }> = {
            'LOW': { icon: '↓' },
            'MEDIUM': { icon: '→' },
            'HIGH': { icon: '↑' },
            'URGENT': { icon: '⚠' },
        };
        return priorityMap[priority] || { icon: '•' };
    };

    const statusInfo = getStatusBadge(ticket.status);
    const priorityInfo = getPriorityBadge(ticket.priority || 'MEDIUM');

    return (
        <div style={{ width: '100%', maxWidth: '600px', padding: 'var(--spacing-4)' }}>
            {/* Botón de Regreso */}
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                {onBack ? (
                    <button
                        onClick={onBack}
                        className="btn btn-primary"
                        style={{
                            height: '54px',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: '600',
                            borderRadius: 'var(--radius-full)',
                            boxShadow: '0 4px 12px var(--color-primary-200)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 var(--spacing-6)',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Consultar Otro Ticket</span>
                    </button>
                ) : (
                    <Link
                        href="/tickets/status"
                        className="btn btn-primary"
                        style={{
                            height: '54px',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: '600',
                            borderRadius: 'var(--radius-full)',
                            boxShadow: '0 4px 12px var(--color-primary-200)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0 var(--spacing-6)',
                            textDecoration: 'none'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Consultar Otro Ticket</span>
                    </Link>
                )}
            </div>

            {/* Tarjeta Principal */}
            <div style={{
                background: 'white',
                borderRadius: 'var(--radius-2xl)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
            }}>
                {/* Sección de Encabezado con Degradado */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-secondary-600))',
                    padding: 'var(--spacing-8)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Círculos Decorativos */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        filter: 'blur(40px)'
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-3)',
                            marginBottom: 'var(--spacing-4)'
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: 'var(--radius-xl)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p style={{
                                    fontSize: 'var(--font-size-sm)',
                                    opacity: 0.9,
                                    marginBottom: 'var(--spacing-1)'
                                }}>
                                    {ticket.tenant.name}
                                </p>
                                <h1 style={{
                                    fontSize: 'var(--font-size-3xl)',
                                    fontWeight: '700',
                                    margin: 0,
                                    lineHeight: 1.2
                                }}>
                                    {ticket.title}
                                </h1>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-3)',
                            flexWrap: 'wrap',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)'
                            }}>
                                <span>{statusInfo.icon}</span>
                                <span>{statusInfo.label}</span>
                            </div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)'
                            }}>
                                <span>{priorityInfo.icon}</span>
                                <span>{ticket.priority}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección de Contenido */}
                <div style={{ padding: 'var(--spacing-8)' }}>
                    {/* ID del Ticket */}
                    <div style={{
                        background: 'var(--color-surface)',
                        padding: 'var(--spacing-4)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--spacing-6)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)',
                            marginBottom: 'var(--spacing-1)',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                            letterSpacing: '0.05em'
                        }}>
                            ID del Ticket
                        </p>
                        <p style={{
                            fontFamily: 'monospace',
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-primary-600)',
                            fontWeight: '600',
                            margin: 0,
                            wordBreak: 'break-all'
                        }}>
                            {ticket.id}
                        </p>
                    </div>

                    {/* Descripción */}
                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <h3 style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-tertiary)',
                            marginBottom: 'var(--spacing-3)',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)'
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Descripción
                        </h3>
                        <p style={{
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--color-text-secondary)',
                            lineHeight: '1.7',
                            margin: 0,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {ticket.description}
                        </p>
                    </div>

                    {/* Cuadrícula de Información */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 'var(--spacing-4)',
                        marginBottom: 'var(--spacing-6)'
                    }}>
                        {/* Asignado a */}
                        {ticket.assignedTo && (
                            <div style={{
                                padding: 'var(--spacing-4)',
                                background: 'var(--color-surface)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                    marginBottom: 'var(--spacing-2)'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
                                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-tertiary)',
                                        margin: 0,
                                        textTransform: 'uppercase',
                                        fontWeight: '600',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Asignado a
                                    </p>
                                </div>
                                <p style={{
                                    fontSize: 'var(--font-size-base)',
                                    color: 'var(--color-text-primary)',
                                    fontWeight: '600',
                                    margin: 0
                                }}>
                                    {ticket.assignedTo.name || ticket.assignedTo.email}
                                </p>
                            </div>
                        )}

                        {/* Creado */}
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                marginBottom: 'var(--spacing-2)'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                                <p style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)',
                                    margin: 0,
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    letterSpacing: '0.05em'
                                }}>
                                    Creado
                                </p>
                            </div>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)',
                                fontWeight: '600',
                                margin: 0,
                                marginBottom: 'var(--spacing-1)'
                            }}>
                                {formatDate(ticket.createdAt)}
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)',
                                margin: 0
                            }}>
                                {getRelativeTime(ticket.createdAt)}
                            </p>
                        </div>

                        {/* Última Actualización */}
                        <div style={{
                            padding: 'var(--spacing-4)',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                marginBottom: 'var(--spacing-2)'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <p style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-tertiary)',
                                    margin: 0,
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    letterSpacing: '0.05em'
                                }}>
                                    Última Actualización
                                </p>
                            </div>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-primary)',
                                fontWeight: '600',
                                margin: 0,
                                marginBottom: 'var(--spacing-1)'
                            }}>
                                {formatDate(ticket.updatedAt)}
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)',
                                margin: 0
                            }}>
                                {getRelativeTime(ticket.updatedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Ayuda de Estado */}
                    <div style={{
                        background: 'var(--color-info-50)',
                        border: '1px solid var(--color-info-200)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--spacing-4)',
                        display: 'flex',
                        gap: 'var(--spacing-3)',
                        alignItems: 'flex-start'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info-600)" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4m0-4h.01" />
                        </svg>
                        <div>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-info-700)',
                                margin: 0,
                                lineHeight: '1.5'
                            }}>
                                <strong>¿Necesitas ayuda?</strong><br />
                                Si tienes preguntas sobre tu ticket, por favor contacta a nuestro equipo de soporte con tu ID de ticket.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
