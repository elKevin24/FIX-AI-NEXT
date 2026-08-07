import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notifyLowStock } from '@/lib/ticket-notifications';
import { isSuperAdmin } from '@/lib/authz';

export interface AddPartToTicketParams {
    ticketId: string;
    partId: string;
    quantity: number;
    tenantId: string;
    userId: string;
    email?: string | null;
}

export class AddPartToTicketUseCase {
    static async execute({ ticketId, partId, quantity, tenantId, userId, email }: AddPartToTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        const superAdmin = isSuperAdmin({ id: userId, email });

        await tenantDb.$transaction(async (tx: any) => {
            const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) {
                throw new Error('Ticket no encontrado');
            }

            if (!superAdmin && ticket.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            const part = await tx.part.findUnique({ where: { id: partId } });

            if (!part) {
                throw new Error('Repuesto no encontrado');
            }

            if (!superAdmin && part.tenantId !== tenantId) {
                throw new Error('No autorizado');
            }

            if (part.quantity < quantity) {
                 throw new Error(`Stock insuficiente. Disponible: ${part.quantity}, Solicitado: ${quantity}`);
            }

            await tx.partUsage.create({
                data: {
                    ticketId,
                    partId,
                    quantity,
                }
            });

            await tx.part.update({
                where: { id: partId },
                data: { quantity: { decrement: quantity } }
            });

            const updatedPart = await tx.part.findUnique({
                where: { id: partId },
                select: { id: true, name: true, quantity: true, minStock: true, tenantId: true }
            });

            if (updatedPart && updatedPart.quantity <= updatedPart.minStock) {
                const admins = await tx.user.findMany({
                    where: {
                        tenantId: updatedPart.tenantId,
                        role: 'ADMIN',
                    },
                    select: { id: true }
                });

                const adminIds = admins.map((a: { id: string }) => a.id);
                await notifyLowStock(updatedPart.tenantId, updatedPart, adminIds);
            }
        });

        return true;
    }
}
