import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';
import { sendEmail } from './email-service';

// --- Types ---

export interface TicketNotificationData {
    id: string;
    ticketNumber?: string;
    title: string;
    status: string;
    tenantId: string;
    customerId: string;
    assignedToId?: string | null;
    customer: {
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
    { oldStatus, newStatus }: { oldStatus: string; newStatus: string }
) {
    const ticketRef = ticket.ticketNumber || ticket.id.slice(0, 8);
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
            subject: `[FIX-AI] Actualización de su servicio #${ticketRef}`,
            text: `Hola ${ticket.customer.name},\n\nLe informamos que su ticket de servicio #${ticketRef} ha cambiado de estado.\n\nNuevo estado: ${statusLabel}\n\nPuede consultar el avance en nuestro portal.\n\nGracias por su confianza.`,
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

    const ticketRef = ticket.ticketNumber || ticket.id.slice(0, 8);

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
            subject: `[FIX-AI] Nuevo ticket asignado: #${ticketRef}`,
            text: `Hola,\n\nSe te ha asignado un nuevo ticket de servicio.\n\nTicket: #${ticketRef}\nTítulo: ${ticket.title}\nAsignado por: ${actorName}\n\nPor favor, revísalo en tu panel de control.`,
        });
    }
}

/**
 * Notifica cuando se crea un nuevo ticket (Al creador y/o admin)
 */
export async function notifyTicketCreated(ticket: TicketNotificationData) {
    // Implementación opcional: Notificar al cliente que recibimos su equipo
    const ticketRef = ticket.ticketNumber || ticket.id.slice(0, 8);

    if (ticket.customer.email) {
        await sendEmail({
            to: ticket.customer.email,
            subject: `[FIX-AI] Orden de Servicio Recibida: #${ticketRef}`,
            text: `Hola ${ticket.customer.name},\n\nHemos registrado correctamente su equipo para servicio técnico.\n\nOrden No: #${ticketRef}\nServicio: ${ticket.title}\n\nLe notificaremos por esta vía cualquier cambio en el estado de su reparación.`,
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
