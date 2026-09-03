import { getTenantPrisma } from '@/lib/tenant-prisma';
import { randomBytes } from 'crypto';
import { createNotification } from './notifications';
import { sendEmail } from './email-service';
import { TicketCreatedEmail } from '@/emails/TicketCreated';
import { TicketStatusChangedEmail } from '@/emails/TicketStatusChanged';
import { TechnicianAssignedEmail } from '@/emails/TechnicianAssigned';
import { LowStockEmail } from '@/emails/LowStock';
import { PartsApprovalRequiredEmail } from '@/emails/PartsApprovalRequired';
import { getBaseUrl } from '@/lib/app-url';

// --- Types ---

export interface TicketNotificationData {
    id: string;
    ticketNumber?: string | null;
    title: string;
    description?: string;
    status: string;
    tenantId: string;
    customerId: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    assignedToId?: string | null;
    customer: {
        id?: string;
        name: string;
        email?: string | null;
    };
    assignedTo?: {
        name?: string | null;
        email: string;
    } | null;
}

const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Abierto',
    WAITING_APPROVAL: 'Esperando Aprobación',
    IN_PROGRESS: 'En Progreso',
    WAITING_FOR_PARTS: 'Esperando Repuestos',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
    REJECTED: 'Rechazado',
};

// --- Notification Functions ---

/**
 * Notifica al cliente que los repuestos propuestos requieren su aprobación.
 * Destinatarios: Cliente (Email) y Técnico asignado (In-app)
 */
export async function notifyPartsApprovalRequired(
    ticket: TicketNotificationData,
    part: { id: string; name: string; sku?: string | null },
    quantity: number,
    priceAtProposal: number,
    total: number,
    customBaseUrl?: string,
) {
    const ticketRef = ticket.ticketNumber;
    const baseUrl = getBaseUrl(customBaseUrl);
    const approvalTokenTtlMs = 72 * 60 * 60 * 1000; // 72 horas

    // 0. Generar y persistir un token de aprobación de un solo uso (One-Time Token)
    const approvalToken = randomBytes(24).toString('base64url');
    const approvalTokenExpiresAt = new Date(Date.now() + approvalTokenTtlMs);

    try {
        const tenantDb = getTenantPrisma(ticket.tenantId);
        await tenantDb.ticket.update({
            where: { id: ticket.id },
            data: { approvalToken, approvalTokenExpiresAt },
        });
    } catch (error) {
        console.error('[notifyPartsApprovalRequired] Failed to persist approval token:', error);
    }

    const buildApprovalLink = (action: 'approve' | 'reject') => {
        const params = new URLSearchParams({ ticketId: ticket.id, token: approvalToken, action });
        return `${baseUrl}/tickets/approval?${params.toString()}`;
    };

    // 1. Notificar al Técnico Asignado (In-app)
    if (ticket.assignedToId) {
        await createNotification({
            userId: ticket.assignedToId,
            tenantId: ticket.tenantId,
            type: 'INFO',
            title: 'Repuestos pendientes de aprobación',
            message: `El ticket #${ticketRef} espera la aprobación del cliente por "${part.name}" (${quantity} uds).`,
            link: `/dashboard/tickets/${ticket.id}`
        });
    }

    // 2. Notificar al Cliente (Email) — la decisión de aprobar/rechazar vive en el cuerpo
    if (ticket.customer.email) {
        await sendEmail({
            to: ticket.customer.email,
            subject: `[FIX-AI] Aprobación de repuestos - ticket #${ticketRef}`,
            react: PartsApprovalRequiredEmail({
                customerName: ticket.customer.name,
                ticketNumber: ticketRef || '',
                ticketTitle: ticket.title,
                partName: part.name,
                partSku: part.sku || '',
                quantity,
                priceAtProposal,
                total,
                approveUrl: buildApprovalLink('approve'),
                rejectUrl: buildApprovalLink('reject'),
                ticketLink: `${baseUrl}/tickets/status/${ticket.id}`
            })
        });
    }
}

/**
 * Notifica cuando un ticket cambia de estado
 * Destinatarios: Cliente (Email) y Técnico asignado (In-app)
 */
export async function notifyTicketStatusChange(
    ticket: TicketNotificationData,
    { oldStatus, newStatus, note, baseUrl }: { oldStatus: string; newStatus: string; note?: string; baseUrl?: string }
) {
    const ticketRef = ticket.ticketNumber;
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    // 1. Notificar al Técnico Asignado (In-app)
    if (ticket.assignedToId) {
        await createNotification({
            userId: ticket.assignedToId,
            tenantId: ticket.tenantId,
            type: 'INFO',
            title: 'Actualización de Ticket',
            message: `El ticket #${ticketRef} cambió de ${STATUS_LABELS[oldStatus] || oldStatus} a ${statusLabel}`,
            link: `/dashboard/tickets/${ticket.id}`
        });
    }

    // 2. Notificar al Cliente (Email)
    if (ticket.customer.email) {
        const appUrl = getBaseUrl(baseUrl);
        await sendEmail({
            to: ticket.customer.email,
            subject: `[FIX-AI] Actualización de ticket #${ticketRef}`,
            react: TicketStatusChangedEmail({
                customerName: ticket.customer.name,
                ticketNumber: ticketRef || '',
                ticketTitle: ticket.title,
                oldStatus: STATUS_LABELS[oldStatus] || oldStatus,
                newStatus: statusLabel,
                ticketLink: `${appUrl}/tickets/status/${ticket.id}`,
                note: note
            })
        });
    }
}

/**
 * Notifica al técnico cuando se le asigna un ticket
 */
export async function notifyTechnicianAssigned(
    ticket: TicketNotificationData,
    actorName: string,
    baseUrl?: string
) {
    if (!ticket.assignedToId) return;

    const ticketRef = ticket.ticketNumber;
    const appUrl = getBaseUrl(baseUrl);

    // 1. In-app
    await createNotification({
        userId: ticket.assignedToId,
        tenantId: ticket.tenantId,
        type: 'INFO',
        title: 'Nuevo Ticket Asignado',
        message: `${actorName} te ha asignado el ticket #${ticketRef}: "${ticket.title}"`,
        link: `/dashboard/tickets/${ticket.id}`
    });

    // 2. Email
    if (ticket.assignedTo?.email) {
        await sendEmail({
             to: ticket.assignedTo.email,
             subject: `[FIX-AI] Asignación: #${ticketRef}`,
             react: TechnicianAssignedEmail({
                 technicianName: ticket.assignedTo.name || 'Técnico',
                 ticketNumber: ticketRef || '',
                 ticketTitle: ticket.title,
                 assignedBy: actorName,
                 ticketLink: `${appUrl}/dashboard/tickets/${ticket.id}`
             })
        });
    }
}

/**
 * Notifica cuando se crea un nuevo ticket (Al creador y/o admin)
 */
export async function notifyTicketCreated(ticket: TicketNotificationData, baseUrl?: string) {
    // Implementación opcional: Notificar al cliente que recibimos su equipo
    const ticketRef = ticket.ticketNumber;
    const appUrl = getBaseUrl(baseUrl);

    if (ticket.customer.email) {
        await sendEmail({
             to: ticket.customer.email,
             subject: `[FIX-AI] Orden recibida: #${ticketRef}`,
             react: TicketCreatedEmail({
                 customerName: ticket.customer.name,
                 ticketNumber: ticketRef || '',
                 ticketTitle: ticket.title,
                 deviceType: ticket.deviceType || '',
                 deviceModel: ticket.deviceModel || '',
                 ticketLink: `${appUrl}/tickets/status/${ticket.id}`
            })
        });
    }
}

/**
 * Alerta de stock bajo (Para Admins)
 */
export async function notifyLowStock(partName: string, currentQuantity: number, tenantId: string) {
    // Buscar administradores del tenant con aislamiento
    const db = getTenantPrisma(tenantId);
    const admins = await db.user.findMany({
        where: {
            role: 'ADMIN',
            isActive: true,
        },
        include: {
            tenant: { select: { name: true } }
        }
    });

    for (const admin of admins) {
        await createNotification({
            userId: admin.id,
            tenantId,
            type: 'WARNING',
            title: 'Alerta de Stock Bajo',
            message: `El repuesto "${partName}" tiene solo ${currentQuantity} unidades disponibles.`,
            link: '/dashboard/parts'
        });

        if (admin.email) {
            await sendEmail({
                to: admin.email,
                subject: `[FIX-AI] Alerta de stock bajo: ${partName}`,
                react: LowStockEmail({
                    partName,
                    currentQuantity,
                    tenantName: admin.tenant?.name || 'Mi taller',
                })
            });
        }
    }
}
