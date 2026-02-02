/**
 * Componente de Ticket 80mm Ultra-Minimalista
 * Diseño de alta densidad optimizado para impresión térmica
 * Tipografía: Labels normales + Datos en Monospace (JetBrains Mono/Geist Mono)
 * @author Senior Fullstack Developer
 */

'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import styles from './Ticket80mm.module.css';
import {
    Ticket80mmData,
    TICKET_STATUS_LABELS,
    TICKET_PRIORITY_LABELS,
} from '@/types/ticket80mm';

interface Ticket80mmProps {
    ticket: Ticket80mmData;
    showParts?: boolean;
    showServices?: boolean;
    showCostSummary?: boolean;
    showQR?: boolean;
    baseUrl?: string; // URL base para el QR code (ej: 'https://tuapp.com')
}

/**
 * Formatea fechas en formato legible español
 */
const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Formatea montos monetarios
 */
const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `Q${num.toFixed(2)}`;
};

/**
 * Obtiene la clase CSS del badge de estado
 */
const getStatusBadgeClass = (status: string): string => {
    const statusMap: Record<string, string> = {
        OPEN: styles.statusOpen,
        IN_PROGRESS: styles.statusInProgress,
        WAITING_FOR_PARTS: styles.statusWaitingForParts,
        RESOLVED: styles.statusResolved,
        CLOSED: styles.statusClosed,
        CANCELLED: styles.statusCancelled,
    };
    return `${styles.statusBadge} ${statusMap[status] || styles.statusOpen}`;
};

/**
 * Obtiene la clase CSS del badge de prioridad
 */
const getPriorityBadgeClass = (priority: string | null): string => {
    if (!priority) return `${styles.priorityBadge} ${styles.priorityMedium}`;

    const priorityMap: Record<string, string> = {
        LOW: styles.priorityLow,
        MEDIUM: styles.priorityMedium,
        HIGH: styles.priorityHigh,
        URGENT: styles.priorityUrgent,
    };
    return `${styles.priorityBadge} ${priorityMap[priority] || styles.priorityMedium}`;
};

/**
 * Calcula el total de partes usadas
 */
const calculatePartsCost = (ticket: Ticket80mmData): number => {
    if (!ticket.partsUsed || ticket.partsUsed.length === 0) return 0;

    return ticket.partsUsed.reduce((total, partUsage) => {
        const price = typeof partUsage.part.price === 'string'
            ? parseFloat(partUsage.part.price)
            : partUsage.part.price;
        return total + (price * partUsage.quantity);
    }, 0);
};

/**
 * Calcula el total de servicios
 */
const calculateServicesCost = (ticket: Ticket80mmData): number => {
    if (!ticket.services || ticket.services.length === 0) return 0;

    return ticket.services.reduce((total, service) => {
        const cost = typeof service.laborCost === 'string'
            ? parseFloat(service.laborCost)
            : service.laborCost;
        return total + cost;
    }, 0);
};

/**
 * Componente principal Ticket80mm con forwardRef para poder acceder al DOM desde el wrapper
 */
const Ticket80mm = forwardRef<HTMLDivElement, Ticket80mmProps>(
    ({ ticket, showParts = true, showServices = true, showCostSummary = true, showQR = true, baseUrl }, ref) => {
        const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
        const [generatedDate, setGeneratedDate] = useState<string>('');

        const partsCost = calculatePartsCost(ticket);
        const servicesCost = calculateServicesCost(ticket);
        const totalCost = partsCost + servicesCost;

        useEffect(() => {
            // Set date after mount to avoid hydration mismatch
            const now = new Date();
            const timer = setTimeout(() => {
                setGeneratedDate(formatDate(now));
            }, 0);
            return () => clearTimeout(timer);
        }, []);

        // Generar QR Code
        useEffect(() => {
            if (!showQR) return;

            const generateQR = async () => {
                try {
                    // Determinar URL base
                    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                    const ticketUrl = `${base}/tickets/status/${ticket.id}`;

                    // Generar QR code como data URL
                    const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
                        width: 120,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF',
                        },
                        errorCorrectionLevel: 'M',
                    });

                    setQrCodeDataUrl(qrDataUrl);
                } catch (error) {
                    console.error('Error generando QR code:', error);
                }
            };

            generateQR();
        }, [ticket.id, showQR, baseUrl]);

        return (
            <div ref={ref} className={styles.ticket80mm}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.companyName}>{ticket.tenant.name}</h1>
                    <p className={styles.documentTitle}>ORDEN DE SERVICIO</p>
                    <p className={styles.ticketId}>#{ticket.id.slice(0, 8).toUpperCase()}</p>

                    <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Ingreso:</span>
                        <span className={styles.metaValue}>{formatDate(ticket.createdAt)}</span>
                    </div>
                </div>

                {/* Estado y Prioridad */}
                <div className={styles.section}>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Estado:</span>
                        <span className={getStatusBadgeClass(ticket.status)}>
                            {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                    </div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Prioridad:</span>
                        <span className={getPriorityBadgeClass(ticket.priority)}>
                            {TICKET_PRIORITY_LABELS[ticket.priority || 'MEDIUM']}
                        </span>
                    </div>
                </div>

                {/* Información del Cliente */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Cliente</h2>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Nombre:</span>
                        <span className={styles.dataValue}>{ticket.customer.name}</span>
                    </div>
                    {ticket.customer.phone && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Teléfono:</span>
                            <span className={styles.dataValue}>{ticket.customer.phone}</span>
                        </div>
                    )}
                    {ticket.customer.nit && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>NIT:</span>
                            <span className={styles.dataValue}>{ticket.customer.nit}</span>
                        </div>
                    )}
                    {ticket.customer.dpi && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>DPI:</span>
                            <span className={styles.dataValue}>{ticket.customer.dpi}</span>
                        </div>
                    )}
                </div>

                {/* Información del Equipo */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Equipo</h2>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Tipo:</span>
                        <span className={styles.dataValue}>{ticket.deviceType || 'PC'}</span>
                    </div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Título:</span>
                        <span className={styles.dataValue}>{ticket.title}</span>
                    </div>
                    {ticket.deviceModel && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Modelo:</span>
                            <span className={styles.dataValue}>{ticket.deviceModel}</span>
                        </div>
                    )}
                    {ticket.serialNumber && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>S/N:</span>
                            <span className={styles.dataValue}>{ticket.serialNumber}</span>
                        </div>
                    )}
                    {ticket.accessories && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Accesorios:</span>
                            <span className={styles.dataValue}>{ticket.accessories}</span>
                        </div>
                    )}
                </div>

                {/* Problema Reportado */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Problema Reportado</h2>
                    <div className={styles.description}>{ticket.description}</div>
                    {ticket.checkInNotes && (
                        <>
                            <h3 className={styles.sectionTitle} style={{ marginTop: '4px' }}>Notas de Ingreso</h3>
                            <div className={styles.description}>{ticket.checkInNotes}</div>
                        </>
                    )}
                </div>

                {/* Técnico Asignado */}
                {ticket.assignedTo && (
                    <div className={styles.section}>
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Técnico:</span>
                            <span className={styles.dataValue}>
                                {ticket.assignedTo.name || ticket.assignedTo.email}
                            </span>
                        </div>
                    </div>
                )}

                {/* Partes Usadas */}
                {showParts && ticket.partsUsed && ticket.partsUsed.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Repuestos</h2>
                        <table className={styles.itemsTable}>
                            <thead>
                                <tr>
                                    <th>Repuesto</th>
                                    <th className={styles.alignCenter}>Cant.</th>
                                    <th className={styles.alignRight}>Precio</th>
                                    <th className={styles.alignRight}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ticket.partsUsed.map((partUsage) => {
                                    const price = typeof partUsage.part.price === 'string'
                                        ? parseFloat(partUsage.part.price)
                                        : partUsage.part.price;
                                    const total = price * partUsage.quantity;

                                    return (
                                        <tr key={partUsage.id}>
                                            <td>{partUsage.part.name}</td>
                                            <td className={styles.alignCenter}>{partUsage.quantity}</td>
                                            <td className={styles.alignRight}>{formatCurrency(price)}</td>
                                            <td className={styles.alignRight}>{formatCurrency(total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Servicios */}
                {showServices && ticket.services && ticket.services.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Servicios</h2>
                        <table className={styles.itemsTable}>
                            <thead>
                                <tr>
                                    <th>Servicio</th>
                                    <th className={styles.alignRight}>Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ticket.services.map((service) => {
                                    const cost = typeof service.laborCost === 'string'
                                        ? parseFloat(service.laborCost)
                                        : service.laborCost;

                                    return (
                                        <tr key={service.id}>
                                            <td>{service.name}</td>
                                            <td className={styles.alignRight}>{formatCurrency(cost)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Resumen de Costos */}
                {showCostSummary && (partsCost > 0 || servicesCost > 0) && (
                    <div className={styles.costSummary}>
                        {partsCost > 0 && (
                            <div className={styles.costRow}>
                                <span className={styles.costLabel}>Subtotal Repuestos:</span>
                                <span className={styles.costValue}>{formatCurrency(partsCost)}</span>
                            </div>
                        )}
                        {servicesCost > 0 && (
                            <div className={styles.costRow}>
                                <span className={styles.costLabel}>Subtotal Servicios:</span>
                                <span className={styles.costValue}>{formatCurrency(servicesCost)}</span>
                            </div>
                        )}
                        <div className={`${styles.costRow} ${styles.totalRow}`}>
                            <span className={styles.costLabel}>TOTAL:</span>
                            <span className={styles.costValue}>{formatCurrency(totalCost)}</span>
                        </div>
                    </div>
                )}

                {/* Fechas Importantes */}
                {(ticket.dueDate || ticket.estimatedCompletionDate) && (
                    <div className={styles.section}>
                        {ticket.dueDate && (
                            <div className={styles.dataRow}>
                                <span className={styles.dataLabel}>Compromiso:</span>
                                <span className={styles.dataValue}>{formatDate(ticket.dueDate)}</span>
                            </div>
                        )}
                        {ticket.estimatedCompletionDate && (
                            <div className={styles.dataRow}>
                                <span className={styles.dataLabel}>Est. Finalización:</span>
                                <span className={styles.dataValue}>{formatDate(ticket.estimatedCompletionDate)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* QR Code */}
                {showQR && qrCodeDataUrl && (
                    <div className={styles.qrSection}>
                        <div className={styles.qrContainer}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={qrCodeDataUrl}
                                alt={`QR Code - Ticket ${ticket.id}`}
                                className={styles.qrCode}
                            />
                        </div>
                        <p className={styles.qrLabel}>Escanea para consultar estado</p>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <p className={styles.footerLine}>Generado: {generatedDate}</p>
                    <p className={styles.footerLine}>FIX-AI - Sistema de Gestión de Talleres</p>
                    {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                        <p className={styles.footerLine} style={{ fontWeight: 600, marginTop: '4px' }}>
                            Garantía: 30 días sobre trabajo realizado
                        </p>
                    ) : null}
                </div>
            </div>
        );
    }
);

Ticket80mm.displayName = 'Ticket80mm';

export default Ticket80mm;
