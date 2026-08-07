import { Ticket, TicketStatus, TicketPriority } from '@prisma/client';

export { TicketStatus, TicketPriority };

export interface ITicketRepository {
    findById(id: string): Promise<TicketWithRelations | null>;
    findByNumber(ticketNumber: string, tenantId: string): Promise<TicketWithRelations | null>;
    findMany(filters: TicketFilters): Promise<TicketWithRelations[]>;
    create(data: TicketCreateInput): Promise<Ticket>;
    update(id: string, data: TicketUpdateInput): Promise<Ticket>;
    updateStatus(id: string, status: TicketStatus, userId: string): Promise<Ticket>;
    delete(id: string): Promise<Ticket>;
    count(filters: TicketFilters): Promise<number>;
}

export interface TicketWithRelations extends Ticket {
    customer?: { id: string; name: string; email?: string | null } | null;
    assignedTo?: { id: string; name?: string | null; email: string } | null;
    partsUsed?: Array<{ id: string; quantity: number; approved: boolean; priceAtProposal: any; part: { id: string; name: string } }>;
}

export interface TicketFilters {
    tenantId: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TicketCreateInput {
    title: string;
    description: string;
    customerId: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    tenantId: string;
    deviceType?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    accessories?: string | null;
    checkInNotes?: string | null;
    createdById: string;
    updatedById: string;
}

export interface TicketUpdateInput {
    title?: string;
    description?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string | null;
    deviceType?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    accessories?: string | null;
    checkInNotes?: string | null;
    cancellationReason?: string | null;
    updatedById: string;
}