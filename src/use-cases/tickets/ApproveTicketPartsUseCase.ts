import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';

export interface ApproveTicketPartsParams {
    ticketId: string;
    tenantId: string;
    userId: string;
    email?: string | null;
}

/**
 * El cliente autoriza (vía el staff, presencial o telefónicamente) los repuestos
 * pendientes del ticket. El trigger de inventario descuenta el stock de forma
 * atómica en el momento de la aprobación; si no hay stock, la transacción
 * se revierte y se muestra el error.
 */
export class ApproveTicketPartsUseCase {
    static async execute({ ticketId, tenantId, userId, email }: ApproveTicketPartsParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const superAdmin = isSuperAdmin({ id: userId, email });

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

            const now = new Date();
            for (const usage of pending) {
                await tx.partUsage.update({
                    where: { id: usage.id },
                    data: { approved: true, approvedAt: now, approvedById: userId },
                });
            }

            if (ticket.status === 'WAITING_APPROVAL') {
                await tx.ticket.update({
                    where: { id: ticketId, tenantId: ticket.tenantId },
                    data: { status: 'IN_PROGRESS', updatedById: userId },
                });
            }

            await tx.auditLog.create({
                data: {
                    action: 'PARTS_APPROVED',
                    module: 'TICKETS',
                    details: JSON.stringify({
                        ticketId,
                        parts: pending.map((p: any) => ({
                            partId: p.partId,
                            name: p.part?.name,
                            quantity: p.quantity,
                            priceAtProposal: Number(p.priceAtProposal),
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
                newStatus: 'IN_PROGRESS',
                note: 'Los repuestos fueron aprobados, se continúa con la reparación.',
            });
        } catch (e) {
            console.error('Failed to notify approval:', e);
        }

        return true;
    }
}
