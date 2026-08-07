import { getTenantPrisma } from '@/lib/tenant-prisma';

export interface RemoveServiceFromTicketParams {
    serviceUsageId: string;
    tenantId: string;
    userId: string;
}

export class RemoveServiceFromTicketUseCase {
    static async execute({ serviceUsageId, tenantId, userId }: RemoveServiceFromTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const usage = await tenantDb.ticketService.findUnique({
            where: { id: serviceUsageId },
            include: { ticket: true }
        });

        if (!usage) {
            throw new Error('Servicio no encontrado en el ticket');
        }

        if (usage.ticket.tenantId !== tenantId) {
            throw new Error('No autorizado para editar este ticket');
        }

        await tenantDb.ticketService.delete({
            where: { id: serviceUsageId }
        });

        return true;
    }
}
