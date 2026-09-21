import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';

export interface RejectTicketPartsParams {
    ticketId: string;
    reason: string;
    tenantId: string;
    userId: string;
    email?: string | null;
}

/**
 * El cliente rechaza (vía el staff) los repuestos pendientes del ticket.
 * Se descartan los repuestos no aprobados (nunca consumieron stock) y el
 * ticket pasa a estado REJECTED con el motivo registrado.
 */
export class RejectTicketPartsUseCase {
    static async execute({ ticketId, reason, tenantId, userId, email }: RejectTicketPartsParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const superAdmin = isSuperAdmin({ id: userId, email });

        if (!reason || reason.trim().length < 10) {
            throw new Error('Debes ingresar un motivo de rechazo de al menos 10 caracteres');
        }

        const result = await tenantDb.$transaction(async (tx: any) => {
            const ticket = await tx.ticket.findUnique({
                where: { id: ticketId },
                include: { customer: true, assignedTo: true },
            });

            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (!superAdmin && ticket.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            const pending = await tx.partUsage.findMany({
                where: { ticketId, approved: false },
                include: { part: true },
            });

            if (pending.length === 0) {
                throw new Error('No hay repuestos pendientes de aprobación');
            }

            for (const usage of pending) {
                await tx.partUsage.delete({ where: { id: usage.id } });
            }

            await tx.ticket.update({
                where: { id: ticketId, tenantId: ticket.tenantId },
                data: { status: 'REJECTED', cancellationReason: reason, updatedById: userId },
            });

            await tx.auditLog.create({
                data: {
                    action: 'PARTS_REJECTED',
                    module: 'TICKETS',
                    details: JSON.stringify({
                        ticketId,
                        reason,
                        parts: pending.map((p: any) => ({
                            partId: p.partId,
                            name: p.part?.name,
                            quantity: p.quantity,
                        })),
                    }),
                    userId,
                    entityType: 'Ticket',
                    entityId: ticketId,
                }
            });

            return { ticket };
        });

        try {
            await notifyTicketStatusChange(result.ticket, {
                oldStatus: 'WAITING_APPROVAL',
                newStatus: 'REJECTED',
                note: reason,
            });
        } catch (e) {
            console.error('Failed to notify rejection:', e);
        }

        return true;
    }
}
