import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { sendEmail } from './email-service';
import { TicketCreatedEmail } from '@/emails/TicketCreated';
import { TicketStatusChangedEmail } from '@/emails/TicketStatusChanged';
import { TechnicianAssignedEmail } from '@/emails/TechnicianAssigned';

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
    IN_PROGRESS: 'En Progreso',
    WAITING_FOR_PARTS: 'Esperando Repuestos',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
};

// --- Notification Functions ---

/**
 * Notifica cuando un ticket cambia de estado
 * Destinatarios: Cliente (Email) y Técnico asignado (In-app)
 */
export async function notifyTicketStatusChange(
    ticket: TicketNotificationData,
    { oldStatus, newStatus, note }: { oldStatus: string; newStatus: string; note?: string }
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
        await sendEmail({
            to: ticket.customer.email,
            subject: `[FIX-AI] Actualización de ticket #${ticketRef}`,
            react: TicketStatusChangedEmail({
                customerName: ticket.customer.name,
                ticketNumber: ticketRef || '',
                ticketTitle: ticket.title,
                oldStatus: STATUS_LABELS[oldStatus] || oldStatus,
                newStatus: statusLabel,
                ticketLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fix-ai-next.vercel.app'}/dashboard/tickets/${ticket.id}`,
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
    actorName: string
) {
    if (!ticket.assignedToId) return;

    const ticketRef = ticket.ticketNumber;

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
                 ticketLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fix-ai-next.vercel.app'}/dashboard/tickets/${ticket.id}`
             })
        });
    }
}

/**
 * Notifica cuando se crea un nuevo ticket (Al creador y/o admin)
 */
export async function notifyTicketCreated(ticket: TicketNotificationData) {
    // Implementación opcional: Notificar al cliente que recibimos su equipo
    const ticketRef = ticket.ticketNumber;

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
                 ticketLink: `${process.env.NEXT_PUBLIC_APP_URL || 'https://fix-ai-next.vercel.app'}/dashboard/tickets/${ticket.id}`
            })
        });
    }
}

/**
 * Alerta de stock bajo (Para Admins)
 */
export async function notifyLowStock(partName: string, currentQuantity: number, tenantId: string) {
    // Buscar administradores del tenant
    const admins = await prisma.user.findMany({
        where: {
            tenantId,
            role: 'ADMIN'
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
    }
}
