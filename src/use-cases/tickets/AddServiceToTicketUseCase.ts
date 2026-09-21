import { getTenantPrisma } from '@/lib/tenant-prisma';

export interface AddServiceToTicketParams {
    ticketId: string;
    serviceId: string;
    tenantId: string;
    userId: string;
}

export class AddServiceToTicketUseCase {
    static async execute({ ticketId, serviceId, tenantId, userId }: AddServiceToTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const ticket = await tenantDb.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            throw new Error('Ticket no encontrado');
        }

        if (ticket.tenantId !== tenantId) {
            throw new Error('No autorizado para editar este ticket');
        }

        const service = await tenantDb.serviceTemplate.findUnique({
            where: { id: serviceId },
        });

        if (!service) {
            throw new Error('Servicio no encontrado');
        }

        if (service.tenantId !== tenantId) {
            throw new Error('Servicio no pertenece a este tenant');
        }

        await tenantDb.ticketService.create({
            data: {
                ticketId,
                serviceId,
                name: service.name,
                laborCost: service.laborCost || 0,
            }
        });

        return true;
    }
}
