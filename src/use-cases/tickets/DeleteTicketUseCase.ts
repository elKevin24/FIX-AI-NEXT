import { getTenantPrisma } from '@/lib/tenant-prisma';

export interface DeleteTicketParams {
    ticketId: string;
    reason: string;
    tenantId: string;
    userId: string;
}

export class DeleteTicketUseCase {
    static async execute({ ticketId, reason, tenantId, userId }: DeleteTicketParams) {
        if (!reason || reason.trim().length < 10) {
            throw new Error('El motivo de eliminación debe tener al menos 10 caracteres');
        }

        const tenantDb = getTenantPrisma(tenantId, userId);

        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!existingTicket) {
            throw new Error('Ticket no encontrado');
        }

        console.log(`[Audit Delete Ticket] Ticket #${existingTicket.ticketNumber} deleted by user ${userId}. Reason: ${reason}`);

        await tenantDb.ticket.delete({
            where: { id: ticketId },
        });

        return true;
    }
}
