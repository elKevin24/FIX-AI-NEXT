/**
 * Ticket Notification System
 *
 * Handles automated notifications (in-app + email) when ticket status changes.
 * This module integrates with both the notification model and email service.
 */

import { TicketStatus } from '@prisma/client';
import { createNotification, NotificationType } from './notifications';
import {
  sendTicketCreatedEmail,
  sendTicketStatusChangeEmail,
  sendTicketResolvedEmail,
  sendTicketClosedEmail,
} from './email-service';

interface TicketData {
  id: string;
  ticketNumber: string;
  deviceType: string;
  deviceModel: string;
  status: TicketStatus;
  customer: {
    id: string;
    name: string;
    email?: string | null;
  };
  assignedTo?: {
    id: string;
    name?: string | null;
  } | null;
  tenantId: string;
}

interface StatusChangeData {
  oldStatus?: TicketStatus;
  newStatus: TicketStatus;
  note?: string;
}

/**
 * Notifica al cliente sobre la creación de un ticket
 */
export async function notifyTicketCreated(ticket: TicketData): Promise<void> {
  const dashboardUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';

  // In-app notification
  await createNotification({
    userId: ticket.customer.id,
    tenantId: ticket.tenantId,
    type: 'SUCCESS',
    title: `Ticket #${ticket.ticketNumber} creado`,
    message: `Tu ${ticket.deviceType} ha sido recibido. Estado: ${getStatusLabel(ticket.status)}`,
    link: `/dashboard/tickets/${ticket.id}`,
  });

  // Email notification (if customer has email)
  if (ticket.customer.email) {
    await sendTicketCreatedEmail({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      customerName: ticket.customer.name,
      customerEmail: ticket.customer.email,
      deviceType: ticket.deviceType,
      deviceModel: ticket.deviceModel,
      newStatus: ticket.status,
      dashboardUrl,
    });
  }
}

/**
 * Notifica al cliente sobre un cambio de estado del ticket
 */
export async function notifyTicketStatusChange(
  ticket: TicketData,
  changeData: StatusChangeData
): Promise<void> {
  const { oldStatus, newStatus, note } = changeData;
  const dashboardUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';

  // Determine notification type and message based on new status
  const { type, title, message } = getNotificationForStatus(newStatus, ticket.ticketNumber);

  // In-app notification
  await createNotification({
    userId: ticket.customer.id,
    tenantId: ticket.tenantId,
    type,
    title,
    message,
    link: `/dashboard/tickets/${ticket.id}`,
  });

  // Email notification based on status
  if (ticket.customer.email) {
    if (newStatus === TicketStatus.RESOLVED) {
      // Special email for resolved tickets
      await sendTicketResolvedEmail({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerName: ticket.customer.name,
        customerEmail: ticket.customer.email,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        oldStatus,
        newStatus,
        technicianName: ticket.assignedTo?.name || undefined,
        resolutionNotes: note,
        dashboardUrl,
      });
    } else if (newStatus === TicketStatus.CLOSED) {
      // Special email for closed tickets
      await sendTicketClosedEmail({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerName: ticket.customer.name,
        customerEmail: ticket.customer.email,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        oldStatus,
        newStatus,
        dashboardUrl,
      });
    } else {
      // Generic status change email
      await sendTicketStatusChangeEmail({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerName: ticket.customer.name,
        customerEmail: ticket.customer.email,
        deviceType: ticket.deviceType,
        deviceModel: ticket.deviceModel,
        oldStatus,
        newStatus,
        technicianName: ticket.assignedTo?.name || undefined,
        dashboardUrl,
      });
    }
  }
}

/**
 * Notifica al técnico asignado sobre un nuevo ticket
 */
export async function notifyTechnicianAssigned(
  technicianId: string,
  tenantId: string,
  ticket: TicketData
): Promise<void> {
  await createNotification({
    userId: technicianId,
    tenantId,
    type: 'INFO',
    title: `Ticket #${ticket.ticketNumber} asignado`,
    message: `Se te ha asignado: ${ticket.deviceType} - ${ticket.customer.name}`,
    link: `/dashboard/tickets/${ticket.id}`,
  });
}

/**
 * Notifica a todos los admins sobre eventos importantes
 */
export async function notifyAdmins(
  tenantId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  },
  adminIds: string[]
): Promise<void> {
  // Send to all admins in parallel
  await Promise.all(
    adminIds.map((adminId) =>
      createNotification({
        userId: adminId,
        tenantId,
        ...notification,
      })
    )
  );
}

/**
 * Notifica a los administradores cuando un repuesto tiene stock bajo
 */
export async function notifyLowStock(
  tenantId: string,
  part: { id: string; name: string; quantity: number; minStock: number },
  adminIds: string[]
): Promise<void> {
  if (adminIds.length === 0) return;

  await notifyAdmins(
    tenantId,
    {
      type: 'WARNING',
      title: '⚠️ Alerta de Stock Bajo',
      message: `El repuesto "${part.name}" tiene solo ${part.quantity} unidades (Mínimo: ${part.minStock}).`,
      link: '/dashboard/parts', // Suponiendo que esta es la ruta de inventario
    },
    adminIds
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    WAITING_FOR_PARTS: 'Esperando Partes',
    RESOLVED: 'Resuelto',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] || status;
}

function getNotificationForStatus(
  status: TicketStatus,
  ticketNumber: string
): { type: NotificationType; title: string; message: string } {
  switch (status) {
    case TicketStatus.OPEN:
      return {
        type: 'INFO',
        title: `Ticket #${ticketNumber} abierto`,
        message: 'Tu ticket está en espera de asignación a un técnico.',
      };

    case TicketStatus.IN_PROGRESS:
      return {
        type: 'INFO',
        title: `Ticket #${ticketNumber} en progreso`,
        message: 'Un técnico está trabajando activamente en tu equipo.',
      };

    case TicketStatus.WAITING_FOR_PARTS:
      return {
        type: 'WARNING',
        title: `Ticket #${ticketNumber} esperando partes`,
        message: 'Estamos esperando la llegada de partes necesarias para completar la reparación.',
      };

    case TicketStatus.RESOLVED:
      return {
        type: 'SUCCESS',
        title: `¡Ticket #${ticketNumber} resuelto!`,
        message: 'Tu equipo está listo para recoger. Por favor, pasa por nuestro taller.',
      };

    case TicketStatus.CLOSED:
      return {
        type: 'SUCCESS',
        title: `Ticket #${ticketNumber} completado`,
        message: 'Gracias por confiar en nosotros. ¡Esperamos verte pronto!',
      };

    case TicketStatus.CANCELLED:
      return {
        type: 'ERROR',
        title: `Ticket #${ticketNumber} cancelado`,
        message: 'Este ticket ha sido cancelado. Contacta al taller si tienes dudas.',
      };

    default:
      return {
        type: 'INFO',
        title: `Actualización de ticket #${ticketNumber}`,
        message: `El estado de tu ticket ha cambiado a: ${getStatusLabel(status)}`,
      };
  }
}
