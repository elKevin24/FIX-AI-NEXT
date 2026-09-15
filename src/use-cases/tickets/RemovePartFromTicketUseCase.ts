import { getTenantPrisma } from '@/lib/tenant-prisma';
import { isSuperAdmin } from '@/lib/authz';

export interface RemovePartFromTicketParams {
    usageId: string;
    tenantId: string;
    userId: string;
    email?: string | null;
}

export class RemovePartFromTicketUseCase {
    static async execute({ usageId, tenantId, userId, email }: RemovePartFromTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const superAdmin = isSuperAdmin({ id: userId, email });

        await tenantDb.$transaction(async (tx: any) => {
            const usage = await tx.partUsage.findUnique({
                where: { id: usageId },
                include: {
                    ticket: { select: { tenantId: true } },
                    part: { select: { tenantId: true } },
                }
            });

            if (!usage) {
                throw new Error('Uso de repuesto no encontrado');
            }

            if (!superAdmin && usage.ticket.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            await tx.partUsage.delete({
                where: { id: usageId }
            });

            await tx.auditLog.create({
                data: {
                    action: 'TICKET_UPDATED',
                    module: 'TICKETS',
                    details: JSON.stringify({ usageId, partId: usage.partId, quantity: usage.quantity, type: 'PART_REMOVED' }),
                    userId,
                    entityType: 'Ticket',
                    entityId: usage.ticketId,
                }
            });

        });

        return true;
    }
}
