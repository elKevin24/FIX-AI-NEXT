import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';

export interface DeleteTicketNoteParams {
    noteId: string;
    tenantId: string;
    userId: string;
    role?: string;
    email?: string | null;
}

export class DeleteTicketNoteUseCase {
    static async execute({ noteId, tenantId, userId, role, email }: DeleteTicketNoteParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const note = await tenantDb.ticketNote.findUnique({
            where: { id: noteId },
            include: {
                ticket: {
                    select: { tenantId: true }
                }
            }
        });

        if (!note) {
            throw new Error('Nota no encontrada');
        }

        const isAuthor = note.authorId === userId;
        const isSameTenant = note.ticket.tenantId === tenantId;
        const isAdmin = role === 'ADMIN';

        if (!isSuperAdmin({ id: userId, email, role }) && !isAuthor && !(isAdmin && isSameTenant)) {
            throw new Error('No autorizado para eliminar esta nota');
        }

        await tenantDb.ticketNote.delete({
            where: { id: noteId }
        });

        return true;
    }
}
