/**
 * Utilidades para generación de enlaces y mensajes de WhatsApp para clientes
 * @author Senior Fullstack Developer
 */

export interface WhatsAppTicketInfo {
    ticketNumber?: string | null;
    id: string;
    title: string;
    status: string;
    deviceModel?: string | null;
    deviceType?: string | null;
    totalAmount?: number | string | null;
    customer: {
        name: string;
        phone?: string | null;
    };
    tenant: {
        name: string;
        phone?: string | null;
    };
}

export type WhatsAppMessageType = 'INTAKE' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'RESOLVED' | 'CLOSED' | 'QUOTE';

/**
 * Limpia y normaliza un número de teléfono para WhatsApp (añade código si es necesario)
 */
export function sanitizePhoneNumber(phone: string, defaultCountryCode: string = '502'): string {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    // Si tiene 8 dígitos (ej. Guatemala), anteponer el código de país
    if (cleaned.length === 8) {
        return `${defaultCountryCode}${cleaned}`;
    }
    return cleaned;
}

/**
 * Genera el texto del mensaje de WhatsApp según el estado del ticket
 */
export function generateWhatsAppMessage(ticket: WhatsAppTicketInfo, type?: WhatsAppMessageType): string {
    const ticketRef = ticket.ticketNumber || `#${ticket.id.slice(0, 8)}`;
    const customerName = ticket.customer.name.trim();
    const deviceDesc = [ticket.deviceType, ticket.deviceModel].filter(Boolean).join(' ') || 'su equipo';
    const workshopName = ticket.tenant.name;

    const messageType = type || (ticket.status as WhatsAppMessageType) || 'INTAKE';

    switch (messageType) {
        case 'INTAKE':
        case 'OPEN':
            return `👋 Hola *${customerName}*,\n\nConfirmamos la recepción de tu ${deviceDesc} en *${workshopName}*.\n\n📋 *Orden de Servicio:* ${ticketRef}\n🔧 *Motivo:* ${ticket.title}\n\nTe notificaremos en cuanto tengamos el diagnóstico listo. ¡Gracias por tu confianza!`;

        case 'IN_PROGRESS':
            return `🔧 Hola *${customerName}*,\n\nTu ${deviceDesc} ya se encuentra *en proceso de revisión/reparación* en *${workshopName}* (Orden ${ticketRef}).\n\nTe mantendremos al tanto del avance.`;

        case 'WAITING_FOR_PARTS':
            return `⏳ Hola *${customerName}*,\n\nTe informamos que tu ${deviceDesc} (Orden ${ticketRef}) está en espera de repuestos para continuar con el servicio en *${workshopName}*.\n\nTe avisaremos tan pronto lleguen las piezas necesarias.`;

        case 'RESOLVED':
            return `🎉 ¡Buenas noticias *${customerName}*!\n\nTu ${deviceDesc} ya está *REPARADO Y LISTO PARA RETIRO* en *${workshopName}*.\n\n📋 *Orden:* ${ticketRef}\n${ticket.totalAmount ? `💰 *Total a pagar:* Q${ticket.totalAmount}\n` : ''}\nPuedes pasar a recogerlo en nuestro horario de atención. ¡Te esperamos!`;

        case 'CLOSED':
            return `✅ Hola *${customerName}*,\n\nConfirmamos la entrega de tu ${deviceDesc} (Orden ${ticketRef}) en *${workshopName}*.\n\n¡Gracias por preferir nuestros servicios! Si tienes alguna consulta sobre tu garantía, con gusto te atendemos.`;

        case 'QUOTE':
            return `📄 Estimado/a *${customerName}*,\n\nTenemos listo el presupuesto para la reparación de tu ${deviceDesc} (Orden ${ticketRef}) en *${workshopName}*.\n\n${ticket.totalAmount ? `💰 *Monto Estimado:* Q${ticket.totalAmount}\n` : ''}Por favor indícanos si deseas proceder con la reparación.`;

        default:
            return `👋 Hola *${customerName}*,\n\nTe contactamos de *${workshopName}* respecto a tu orden ${ticketRef} (${deviceDesc}).`;
    }
}

/**
 * Genera la URL completa de wa.me lista para abrir
 */
export function buildWhatsAppUrl(ticket: WhatsAppTicketInfo, type?: WhatsAppMessageType): string | null {
    if (!ticket.customer.phone) return null;

    const phone = sanitizePhoneNumber(ticket.customer.phone);
    if (!phone) return null;

    const message = generateWhatsAppMessage(ticket, type);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
