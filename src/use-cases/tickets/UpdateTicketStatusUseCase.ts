
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { createNotification } from '@/lib/notifications';
import { notifyTicketStatusChange } from '@/lib/ticket-notifications';

export interface UpdateTicketStatusParams {
    ticketId: string;
    status: string;
    note?: string | null;
    tenantId: string;
    userId: string;
}

export class UpdateTicketStatusUseCase {
    static async execute({ ticketId, status, note, tenantId, userId }: UpdateTicketStatusParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        
        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId },
            include: { partsUsed: true, customer: true, assignedTo: true }
        });

        if (!existingTicket) {
             throw new Error('Ticket no encontrado');
        }

        if (status === 'CANCELLED') {
            if (!note || note.trim().length < 10) {
                throw new Error('Debes ingresar un motivo de cancelación de al menos 10 caracteres');
            }
        }

        await tenantDb.$transaction(async (tx: any) => {
             // We cannot use getTenantPrisma with tx because tx doesn't support $extends.
             // We must apply the tenant constraint manually.
             
             if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
                 if (existingTicket.partsUsed.length > 0) {
                     for (const usage of existingTicket.partsUsed) {
                         await tx.partUsage.delete({
                             where: { id: usage.id }
                          });
                     }
                 }
             }

             const updateData: any = { status: status as any, updatedById: userId };
             if (status === 'CANCELLED' && note) {
                 updateData.cancellationReason = note;
             }

             await tx.ticket.update({
                 where: { id: ticketId, tenantId: existingTicket.tenantId },
                 data: updateData
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
                await notifyTicketStatusChange(
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
            await createNotification({
                userId: existingTicket.assignedToId,
                tenantId: tenantId,
                type: 'INFO',
                title: 'Estado del Ticket Actualizado',
                message: `El ticket #${existingTicket.ticketNumber} cambió a estado ${status}`,
                link: `/dashboard/tickets/${ticketId}`
            });
        }

        try {
            const updatedFullTicket = await tenantDb.ticket.findUnique({
                where: { id: ticketId },
                include: { customer: true, assignedTo: true }
            });
            
            if (updatedFullTicket) {
                await notifyTicketStatusChange({
                    ...updatedFullTicket,
                    ticketNumber: updatedFullTicket.ticketNumber,
                } as any, {
                    oldStatus: existingTicket.status as any,
                    newStatus: status as any,
                });
            }
        } catch (e) {
            console.error('Failed to notify customer of status update:', e);
        }

        return true;
    }
}
