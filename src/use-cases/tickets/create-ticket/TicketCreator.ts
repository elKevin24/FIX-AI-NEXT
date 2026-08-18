import { getTenantPrisma } from '@/lib/tenant-prisma';
import { createActionRepositories } from '@/lib/action-factory';
import { ITicketRepository } from '@/lib/repositories';
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
    private readonly ticketRepo: ITicketRepository;

    constructor(
        private readonly tenantId: string,
        private readonly userId: string,
        ticketRepo?: ITicketRepository
    ) {
        this.ticketRepo = ticketRepo ?? createActionRepositories(this.tenantId, this.userId).ticketRepo;
    }

    async create(ticketData: TicketCreationData): Promise<CreatedTicket> {
        const newTicket = await this.ticketRepo.create({
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
        } as any);

        const t: any = newTicket;
        return {
            id: t.id,
            ticketNumber: t.ticketNumber,
            title: t.title,
            status: t.status,
            tenantId: t.tenantId,
            customerId: t.customerId,
            deviceType: t.deviceType,
            deviceModel: t.deviceModel,
            assignedToId: t.assignedToId,
            customer: {
                id: t.customer?.id || t.customerId,
                name: t.customer?.name || '',
                email: t.customer?.email || null,
            },
            assignedTo: t.assignedTo ? {
                name: t.assignedTo.name,
                email: t.assignedTo.email,
            } : null,
        };
    }
}