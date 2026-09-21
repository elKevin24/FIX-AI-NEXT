import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreateTicketInput } from '@/lib/schemas';

export interface TicketCreationData extends CreateTicketInput {
    customerId: string;
}

export interface CreatedTicket {
    id: string;
    ticketNumber: string | null;
    title: string;
    status: string;
    tenantId: string;
    customerId: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    assignedToId?: string | null;
    customer: ResolvedCustomer;
    assignedTo: AssignedTo | null;
}

export interface ResolvedCustomer {
    id: string;
    name: string;
    email?: string | null;
}

export interface AssignedTo {
    name?: string | null;
    email: string;
}

export class TicketCreator {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    async create(ticketData: TicketCreationData): Promise<CreatedTicket> {
        const tenantDb = getTenantPrisma(this.tenantId, this.userId);
        
        const newTicket = await tenantDb.ticket.create({
            data: {
                title: ticketData.title,
                description: ticketData.description,
                customerId: ticketData.customerId,
                status: ticketData.status || 'OPEN',
                priority: ticketData.priority || 'MEDIUM',
                tenantId: this.tenantId,
                deviceType: ticketData.deviceType,
                deviceModel: ticketData.deviceModel,
                serialNumber: ticketData.serialNumber,
                accessories: ticketData.accessories,
                checkInNotes: ticketData.checkInNotes,
                createdById: this.userId,
                updatedById: this.userId,
            },
            include: {
                customer: true,
                assignedTo: true,
            }
        });

        return {
            id: newTicket.id,
            ticketNumber: newTicket.ticketNumber,
            title: newTicket.title,
            status: newTicket.status,
            tenantId: newTicket.tenantId,
            customerId: newTicket.customerId,
            deviceType: newTicket.deviceType,
            deviceModel: newTicket.deviceModel,
            assignedToId: newTicket.assignedToId,
            customer: {
                id: newTicket.customer.id,
                name: newTicket.customer.name,
                email: newTicket.customer.email,
            },
            assignedTo: newTicket.assignedTo ? {
                name: newTicket.assignedTo.name,
                email: newTicket.assignedTo.email,
            } : null,
        };
    }
}