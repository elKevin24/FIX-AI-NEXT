import { getTenantPrisma } from '@/lib/tenant-prisma';
import { ITicketRepository, TicketFilters, TicketCreateInput, TicketUpdateInput, TicketWithRelations } from '../interfaces/ticket.repository.interface';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class PrismaTicketRepository implements ITicketRepository {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    private get db() {
        return getTenantPrisma(this.tenantId, this.userId);
    }

    async findById(id: string): Promise<TicketWithRelations | null> {
        return this.db.ticket.findUnique({
            where: { id },
            include: {
                customer: true,
                assignedTo: true,
                partsUsed: {
                    include: { part: true }
                }
            }
        }) as Promise<TicketWithRelations | null>;
    }

    async findByNumber(ticketNumber: string, tenantId: string): Promise<TicketWithRelations | null> {
        return this.db.ticket.findFirst({
            where: { ticketNumber, tenantId },
            include: {
                customer: true,
                assignedTo: true,
                tenant: true
            }
        }) as Promise<TicketWithRelations | null>;
    }

    async findMany(filters: TicketFilters): Promise<TicketWithRelations[]> {
        const { tenantId, status, priority, assignedToId, customerId, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
        
        const where: any = { tenantId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedToId) where.assignedToId = assignedToId;
        if (customerId) where.customerId = customerId;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { ticketNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        return this.db.ticket.findMany({
            where,
            include: {
                customer: true,
                assignedTo: true,
                partsUsed: { include: { part: true } }
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit
        }) as Promise<TicketWithRelations[]>;
    }

    async create(data: TicketCreateInput): Promise<TicketWithRelations> {
        return this.db.ticket.create({
            data,
            include: {
                customer: true,
                assignedTo: true
            }
        }) as Promise<TicketWithRelations>;
    }

    async update(id: string, data: TicketUpdateInput): Promise<TicketWithRelations> {
        return this.db.ticket.update({
            where: { id },
            data,
            include: {
                customer: true,
                assignedTo: true
            }
        }) as Promise<TicketWithRelations>;
    }

    async updateStatus(id: string, status: TicketStatus, userId: string): Promise<TicketWithRelations> {
        return this.db.ticket.update({
            where: { id },
            data: { status, updatedById: userId },
            include: {
                customer: true,
                assignedTo: true
            }
        }) as Promise<TicketWithRelations>;
    }

    async delete(id: string): Promise<TicketWithRelations> {
        return this.db.ticket.delete({
            where: { id },
            include: {
                customer: true,
                assignedTo: true
            }
        }) as Promise<TicketWithRelations>;
    }

    async count(filters: TicketFilters): Promise<number> {
        const { tenantId, status, priority, assignedToId, customerId, search } = filters;
        
        const where: any = { tenantId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedToId) where.assignedToId = assignedToId;
        if (customerId) where.customerId = customerId;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { ticketNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        return this.db.ticket.count({ where });
    }
}