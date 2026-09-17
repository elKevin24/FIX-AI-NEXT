
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { createNotification } from '@/lib/notifications';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';
import type { Prisma, TicketStatus } from '@prisma/client';
import { NotFoundError, ValidationError, BusinessRuleError } from '@/lib/errors';

export interface UpdateTicketStatusParams {
    ticketId: string;
    status: TicketStatus;
    note?: string | null;
    tenantId: string;
    userId: string;
}

export interface UpdateTicketStatusDependencies {
    db?: any;
    statusNotifier?: typeof notifyTicketStatusChange;
    techNotifier?: typeof createNotification;
}

export class UpdateTicketStatusUseCase {
    static async execute(
        { ticketId, status, note, tenantId, userId }: UpdateTicketStatusParams,
        deps?: UpdateTicketStatusDependencies
    ) {
        const tenantDb = deps?.db ?? getTenantPrisma(tenantId, userId);
        const notifyStatus = deps?.statusNotifier ?? notifyTicketStatusChange;
        const notifyTech = deps?.techNotifier ?? createNotification;
        
        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId },
            include: { partsUsed: true, customer: true, assignedTo: true }
        });

        if (!existingTicket) {
             throw new NotFoundError('Ticket', ticketId);
        }

        if (status === 'CANCELLED') {
            if (!note || note.trim().length < 10) {
                throw new ValidationError('Debes ingresar un motivo de cancelación de al menos 10 caracteres', 'note');
            }
        }

        await tenantDb.$transaction(async (tx: Prisma.TransactionClient) => {
             // We cannot use getTenantPrisma with tx because tx doesn't support $extends.
             // We must apply the tenant constraint manually.
             
             if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
                 if (existingTicket.partsUsed.length > 0) {
                     for (const usage of existingTicket.partsUsed) {
                         await tx.partUsage.delete({
                             where: { id: usage.id, ticketId: existingTicket.id }
                          });
                     }
                 }
             }

             const updateData: any = { status, updatedById: userId };
             if (status === 'CANCELLED' && note) {
                 updateData.cancellationReason = note;
             }

             await tx.ticket.update({
                 where: { id: ticketId, tenantId: existingTicket.tenantId },
                 data: updateData
             });

             await tx.auditLog.create({
                data: {
                    action: 'TICKET_STATUS_CHANGED',
                    module: 'TICKETS',
                    details: JSON.stringify({ id: existingTicket.id, oldStatus: existingTicket.status, newStatus: status }),
                    userId,
                    tenantId: existingTicket.tenantId,
                    entityType: 'Ticket',
                    entityId: existingTicket.id,
                }
             });

             if (note) {
                await tx.ticketNote.create({
                    data: {
                        content: note,
                        ticketId: ticketId,
                        authorId: userId,
                        isInternal: true
                    }
                });
             }
        });

        if (status !== existingTicket.status) {
             try {
                await notifyStatus(
                    {
                        id: existingTicket.id,
                        ticketNumber: existingTicket.ticketNumber,
                        title: existingTicket.title,
                        status: existingTicket.status,
                        tenantId: existingTicket.tenantId,
                        customerId: existingTicket.customerId,
                        customer: existingTicket.customer,
                        assignedToId: existingTicket.assignedToId,
                        deviceType: existingTicket.deviceType || 'PC',
                        deviceModel: existingTicket.deviceModel || '',
                        assignedTo: existingTicket.assignedTo,
                    }, 
                    { 
                        oldStatus: existingTicket.status, 
                        newStatus: status,
                        note: note || "Cambio de estado"
                    }
                 );
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        if (existingTicket.assignedToId && existingTicket.assignedToId !== userId) {
            await notifyTech({
                userId: existingTicket.assignedToId,
                tenantId: tenantId,
                type: 'INFO',
                title: 'Estado del Ticket Actualizado',
                message: `El ticket #${existingTicket.ticketNumber} cambió a estado ${status}`,
                link: `/dashboard/tickets/${ticketId}`
            });
        }

        return true;
    }
}
