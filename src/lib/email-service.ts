/**
 * Email Service using Resend
 *
 * Handles automated email notifications for ticket status changes.
 */

import { Resend } from 'resend';
import { TicketStatus } from '@prisma/client';

// Initialize Resend with API key if available, otherwise use a placeholder to prevent build errors
// logic handles missing key by returning early in send functions
const apiKey = (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0) 
  ? process.env.RESEND_API_KEY 
  : 're_123456789';
const resend = new Resend(apiKey);

// Default sender email (must be verified in Resend)
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@fixai.app';

// Helper to check if email service is configured
const isEmailConfigured = () => {
  return !!process.env.RESEND_API_KEY;
};



interface TicketEmailData {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  deviceType: string;
  deviceModel: string;
  oldStatus?: TicketStatus;
  newStatus: TicketStatus;
  technicianName?: string;
  estimatedCompletion?: string;
  resolutionNotes?: string;
  dashboardUrl: string;
}

/**
 * Envía notificación de creación de ticket al cliente
 */
export async function sendTicketCreatedEmail(data: TicketEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured (missing RESEND_API_KEY). Skipping email.');
    return;
  }

  if (!data.customerEmail) {
    console.warn(`No email for customer: ${data.customerName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: data.customerEmail,
      subject: `✅ Ticket #${data.ticketNumber} creado - ${data.deviceType}`,
      html: getTicketCreatedTemplate(data),
    });
    console.log(`✓ Email sent to ${data.customerEmail} for ticket creation`);
  } catch (error) {
    console.error('Failed to send ticket created email:', error);
  }
}

/**
 * Envía notificación de cambio de estado al cliente
 */
export async function sendTicketStatusChangeEmail(data: TicketEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured (missing RESEND_API_KEY). Skipping email.');
    return;
  }

  if (!data.customerEmail) {
    console.warn(`No email for customer: ${data.customerName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: data.customerEmail,
      subject: `📬 Actualización Ticket #${data.ticketNumber} - ${getStatusLabel(data.newStatus)}`,
      html: getStatusChangeTemplate(data),
    });
    console.log(`✓ Email sent to ${data.customerEmail} for status: ${data.newStatus}`);
  } catch (error) {
    console.error('Failed to send status change email:', error);
  }
}

/**
 * Envía notificación de ticket resuelto al cliente
 */
export async function sendTicketResolvedEmail(data: TicketEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured (missing RESEND_API_KEY). Skipping email.');
    return;
  }

  if (!data.customerEmail) {
    console.warn(`No email for customer: ${data.customerName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: data.customerEmail,
      subject: `✅ Ticket #${data.ticketNumber} resuelto - Listo para recoger`,
      html: getTicketResolvedTemplate(data),
    });
    console.log(`✓ Email sent to ${data.customerEmail} for ticket resolution`);
  } catch (error) {
    console.error('Failed to send ticket resolved email:', error);
  }
}

/**
 * Envía notificación de ticket entregado/cerrado al cliente
 */
export async function sendTicketClosedEmail(data: TicketEmailData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Email service not configured (missing RESEND_API_KEY). Skipping email.');
    return;
  }

  if (!data.customerEmail) {
    console.warn(`No email for customer: ${data.customerName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: data.customerEmail,
      subject: `🎉 Ticket #${data.ticketNumber} completado - Gracias por confiar en nosotros`,
      html: getTicketClosedTemplate(data),
    });
    console.log(`✓ Email sent to ${data.customerEmail} for ticket closure`);
  } catch (error) {
    console.error('Failed to send ticket closed email:', error);
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function getTicketCreatedTemplate(data: TicketEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Creado</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Ticket Creado</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                Hola <strong>${data.customerName}</strong>,
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Tu ticket ha sido creado exitosamente. Nuestro equipo técnico se pondrá en marcha pronto.
              </p>

              <!-- Ticket Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Número de Ticket</p>
                    <p style="margin: 0 0 20px 0; color: #333; font-size: 24px; font-weight: bold;">#${data.ticketNumber}</p>

                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Dispositivo</p>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">${data.deviceType} - ${data.deviceModel}</p>

                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Estado</p>
                    <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">
                      <span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 4px; display: inline-block;">
                        ${getStatusLabel(data.newStatus)}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
                Recibirás actualizaciones automáticas por email cada vez que el estado de tu ticket cambie.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${data.dashboardUrl}/dashboard/tickets/${data.ticketId}"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Detalles del Ticket
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 13px; margin: 0;">
                Este es un mensaje automático, por favor no responder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getStatusChangeTemplate(data: TicketEmailData): string {
  const statusInfo = getStatusInfo(data.newStatus);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Ticket</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: ${statusInfo.gradient}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${statusInfo.icon} Actualización de Ticket</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                Hola <strong>${data.customerName}</strong>,
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Tu ticket <strong>#${data.ticketNumber}</strong> ha cambiado de estado.
              </p>

              <!-- Status Change Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; text-align: center;">Nuevo Estado</p>
                    <p style="margin: 0; text-align: center;">
                      <span style="background-color: ${statusInfo.bgColor}; color: ${statusInfo.textColor}; padding: 12px 24px; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">
                        ${statusInfo.icon} ${statusInfo.label}
                      </span>
                    </p>
                    ${statusInfo.description ? `
                    <p style="margin: 15px 0 0 0; color: #666; font-size: 14px; text-align: center; line-height: 1.6;">
                      ${statusInfo.description}
                    </p>
                    ` : ''}
                    ${data.technicianName ? `
                    <p style="margin: 15px 0 0 0; color: #666; font-size: 14px; text-align: center;">
                      Técnico asignado: <strong>${data.technicianName}</strong>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${data.dashboardUrl}/dashboard/tickets/${data.ticketId}"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Detalles del Ticket
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 13px; margin: 0;">
                Este es un mensaje automático, por favor no responder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getTicketResolvedTemplate(data: TicketEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Resuelto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ ¡Ticket Resuelto!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
                Hola <strong>${data.customerName}</strong>,
              </p>

              <p style="color: #333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                ¡Buenas noticias! Tu ${data.deviceType} está listo para recoger.
              </p>

              <!-- Success Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 6px; margin: 25px 0; border-left: 4px solid #10b981;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0; font-size: 48px;">✅</p>
                    <p style="margin: 10px 0 0 0; color: #065f46; font-size: 20px; font-weight: bold;">
                      Reparación Completada
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Ticket Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Ticket</p>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 20px; font-weight: bold;">#${data.ticketNumber}</p>

                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Dispositivo</p>
                    <p style="margin: 0 0 15px 0; color: #333; font-size: 16px;">${data.deviceType} - ${data.deviceModel}</p>

                    ${data.resolutionNotes ? `
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Notas de Resolución</p>
                    <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; background-color: white; padding: 12px; border-radius: 4px;">
                      ${data.resolutionNotes}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 25px 0;">
                Por favor, pasa por nuestro taller para recoger tu equipo. Te esperamos.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${data.dashboardUrl}/dashboard/tickets/${data.ticketId}"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Ver Detalles del Ticket
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 13px; margin: 0;">
                Gracias por confiar en nosotros. ¡Esperamos verte pronto!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getTicketClosedTemplate(data: TicketEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Completado</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 ¡Gracias por tu Confianza!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="color: #333; font-size: 18px; line-height: 1.6; margin-top: 0;">
                Hola <strong>${data.customerName}</strong>,
              </p>

              <p style="margin: 30px 0; font-size: 64px;">🎉</p>

              <p style="color: #333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                El ticket #${data.ticketNumber} ha sido completado y cerrado exitosamente.
              </p>

              <p style="color: #666; font-size: 16px; line-height: 1.8; margin: 25px 0;">
                Esperamos que tu ${data.deviceType} esté funcionando perfectamente.<br>
                Fue un placer atenderte.
              </p>

              <!-- Thank You Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 6px; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0; color: #92400e; font-size: 16px; line-height: 1.6;">
                      Si necesitas algún servicio adicional o tienes alguna pregunta,<br>
                      no dudes en contactarnos nuevamente.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                ¡Esperamos verte pronto! 👋
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 13px; margin: 0;">
                Este es un mensaje automático, por favor no responder.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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

interface StatusInfo {
  label: string;
  icon: string;
  gradient: string;
  bgColor: string;
  textColor: string;
  description?: string;
}

function getStatusInfo(status: TicketStatus): StatusInfo {
  const statusMap: Record<TicketStatus, StatusInfo> = {
    OPEN: {
      label: 'Abierto',
      icon: '📝',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      bgColor: '#dbeafe',
      textColor: '#1e40af',
      description: 'Tu ticket ha sido recibido y está en espera de asignación.',
    },
    IN_PROGRESS: {
      label: 'En Progreso',
      icon: '🔧',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      description: 'Nuestro técnico está trabajando activamente en tu equipo.',
    },
    WAITING_FOR_PARTS: {
      label: 'Esperando Partes',
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      bgColor: '#ede9fe',
      textColor: '#5b21b6',
      description: 'Estamos esperando la llegada de partes necesarias para completar la reparación.',
    },
    RESOLVED: {
      label: 'Resuelto',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      description: 'La reparación está completa. Tu equipo está listo para recoger.',
    },
    CLOSED: {
      label: 'Cerrado',
      icon: '🎉',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      bgColor: '#e0e7ff',
      textColor: '#3730a3',
      description: 'El ticket ha sido completado y cerrado exitosamente.',
    },
    CANCELLED: {
      label: 'Cancelado',
      icon: '❌',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      description: 'Este ticket ha sido cancelado.',
    },
  };
  return statusMap[status];
}
