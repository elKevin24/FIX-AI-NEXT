import { getTenantPrisma } from '@/lib/tenant-prisma';
import { createNotification } from '@/lib/notifications';

export interface AddTicketNoteParams {
    ticketId: string;
    content: string;
    isInternal: boolean;
    tenantId: string;
    userId: string;
}

export class AddTicketNoteUseCase {
    static async execute({ ticketId, content, isInternal, tenantId, userId }: AddTicketNoteParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const ticket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            throw new Error('Ticket no encontrado');
        }

        await tenantDb.ticketNote.create({
            data: {
                content: content.trim(),
                isInternal,
                ticketId,
                authorId: userId,
            }
        });

        await tenantDb.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });

        if (ticket.assignedToId && ticket.assignedToId !== userId) {
            await createNotification({
                userId: ticket.assignedToId,
                tenantId,
                type: 'INFO',
                title: 'Nueva Nota en Ticket',
                message: `Nueva nota en ticket #${ticket.id.slice(0, 8)}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                link: `/dashboard/tickets/${ticketId}`
            });
        }

        return true;
    }
}
