import { getTenantPrisma } from '@/lib/tenant-prisma';

export interface DeleteTicketParams {
    ticketId: string;
    tenantId: string;
    userId: string;
}

export class DeleteTicketUseCase {
    static async execute({ ticketId, tenantId, userId }: DeleteTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!existingTicket) {
            throw new Error('Ticket no encontrado');
        }

        await tenantDb.ticket.delete({
            where: { id: ticketId },
        });

        return true;
    }
}
