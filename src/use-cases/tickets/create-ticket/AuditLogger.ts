import { getTenantPrisma } from '@/lib/tenant-prisma';

export interface AuditLogData {
    action: string;
    module: string;
    details: string;
    userId: string;
    entityType: string;
    entityId: string;
}

export class AuditLogger {
    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {}

    async logTicketCreated(ticketId: string, title: string): Promise<void> {
        const tenantDb = getTenantPrisma(this.tenantId, this.userId);
        
        await tenantDb.auditLog.create({
            data: {
                action: 'TICKET_CREATED',
                module: 'TICKETS',
                details: JSON.stringify({ id: ticketId, title }),
                userId: this.userId,
                tenantId: this.tenantId,
                entityType: 'Ticket',
                entityId: ticketId,
            }
        });
    }
}