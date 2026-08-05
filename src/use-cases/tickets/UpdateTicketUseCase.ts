import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { notifyTicketStatusChange, notifyTechnicianAssigned } from '@/lib/ticket-notifications';
import { UpdateTicketInput } from '@/lib/schemas';

export interface UpdateTicketParams {
    validatedData: UpdateTicketInput;
    tenantId: string;
    userId: string;
    userName?: string;
}

export class UpdateTicketUseCase {
    static async execute({ validatedData, tenantId, userId, userName }: UpdateTicketParams) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        
        const { 
            ticketId, title, description, status, priority, assignedToId,
            deviceType, deviceModel, serialNumber, accessories, checkInNotes, cancellationReason
        } = validatedData;

        const existingTicket = await tenantDb.ticket.findUnique({
            where: { id: ticketId },
            include: { partsUsed: true, customer: true, assignedTo: true }
        });

        if (!existingTicket) {
             throw new Error('Ticket no encontrado');
        }

        if (assignedToId && assignedToId !== existingTicket.assignedToId) {
             const unavailableRecord = await tenantDb.technicianUnavailability.findFirst({
                 where: {
                     userId: assignedToId,
                     startDate: { lte: new Date() },
                     endDate: { gte: new Date() },
                     isActive: true
                 }
             });

             if (unavailableRecord) {
                 throw new Error(`El técnico seleccionado no está disponible (Motivo: ${unavailableRecord.reason}).`);
             }
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (status) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
        
        if (deviceType !== undefined) updateData.deviceType = deviceType;
        if (deviceModel !== undefined) updateData.deviceModel = deviceModel;
        if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
        if (accessories !== undefined) updateData.accessories = accessories;
        if (checkInNotes !== undefined) updateData.checkInNotes = checkInNotes;
        if (status === 'CANCELLED' && cancellationReason) updateData.cancellationReason = cancellationReason;

        updateData.updatedById = userId;

        await prisma.$transaction(async (tx: any) => {
             const txTenantDb = getTenantPrisma(existingTicket.tenantId, userId, tx);

             if (status === 'CANCELLED' && existingTicket.status !== 'CANCELLED') {
                 if (existingTicket.partsUsed.length > 0) {
                     for (const usage of existingTicket.partsUsed) {
                         await txTenantDb.partUsage.delete({
                             where: { id: usage.id }
                         });
                     }
                 }
             }

             await txTenantDb.ticket.update({
                 where: { id: ticketId },
                 data: updateData,
             });
        });

        if (status && status !== existingTicket.status) {
             try {
                 await notifyTicketStatusChange(
                    {
                        id: existingTicket.id,
                        ticketNumber: existingTicket.ticketNumber,
                        title: updateData.title || existingTicket.title,
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
                        note: updateData.cancellationReason
                    }
                 );
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        if (assignedToId && assignedToId !== existingTicket.assignedToId) {
             try {
                 const updatedFullTicket = await tenantDb.ticket.findUnique({
                    where: { id: ticketId },
                    include: { customer: true, assignedTo: true }
                 });
                 
                 if (updatedFullTicket) {
                     await notifyTechnicianAssigned({
                         id: updatedFullTicket.id,
                         ticketNumber: updatedFullTicket.ticketNumber,
                         title: updatedFullTicket.title,
                         status: updatedFullTicket.status,
                         tenantId: updatedFullTicket.tenantId,
                         customerId: updatedFullTicket.customerId,
                         customer: updatedFullTicket.customer,
                         assignedTo: updatedFullTicket.assignedTo || undefined,
                         assignedToId: updatedFullTicket.assignedToId,
                         deviceType: updatedFullTicket.deviceType || 'PC',
                         deviceModel: updatedFullTicket.deviceModel || ''
                     }, userName || 'Admin');
                 }
             } catch (e) {
                 console.error('Notification error', e);
             }
        }

        return true;
    }
}
