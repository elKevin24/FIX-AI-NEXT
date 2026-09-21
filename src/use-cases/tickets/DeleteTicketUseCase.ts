import { UpdateTicketStatusUseCase } from './UpdateTicketStatusUseCase';

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

        // Soft deletion: Updates status to DELETED, stores the reason, returns parts to inventory, and logs audit note.
        // The record is NEVER hard deleted from the database. DELETED is a terminal state.
        return UpdateTicketStatusUseCase.execute({
            ticketId,
            status: 'DELETED',
            note: `[TICKET ELIMINADO]: ${reason}`,
            tenantId,
            userId,
        });
    }
}
