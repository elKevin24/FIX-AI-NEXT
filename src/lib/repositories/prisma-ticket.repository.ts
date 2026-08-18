import { Ticket, PrismaClient } from '@prisma/client';
import { ITicketRepository } from './domain.repositories';
import { getTenantPrisma } from '../tenant-prisma';

export class PrismaTicketRepository implements ITicketRepository {
    private db: PrismaClient;

    constructor(tenantId: string, userId?: string) {
        this.db = getTenantPrisma(tenantId, userId);
    }

    async findById(id: string): Promise<Ticket | null> {
        return await this.db.ticket.findUnique({
            where: { id }
        });
    }

    async findByIdWithRelations(id: string): Promise<any | null> {
        return await this.db.ticket.findUnique({
            where: { id },
            include: {
                customer: true,
                assignedTo: true,
                partsUsed: {
                    include: {
                        part: true
                    }
                },
                services: true,
                notes: {
                    include: {
                        author: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
    }

    async findMany(filter?: any): Promise<Ticket[]> {
        return await this.db.ticket.findMany(filter);
    }

    async create(data: any): Promise<Ticket> {
        return await this.db.ticket.create({ data });
    }

    async update(id: string, data: any): Promise<Ticket> {
        return await this.db.ticket.update({
            where: { id },
            data
        });
    }

    async delete(id: string): Promise<Ticket> {
        return await this.db.ticket.delete({
            where: { id }
        });
    }
}
