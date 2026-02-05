
'use server';
import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { TicketStatus } from '@/generated/prisma';

export async function bulkUpdateTicketStatus(ticketIds: string[], status: TicketStatus) {
    const session = await auth();
    if (!session?.user?.tenantId) return { success: false, message: 'Unauthorized' };

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    
    try {
        await db.ticket.updateMany({
            where: {
                id: { in: ticketIds },
                tenantId: session.user.tenantId
            },
            data: { 
                status: status,
                updatedById: session.user.id
            }
        });
        revalidatePath('/dashboard/tickets');
        return { success: true, message: `Updated ${ticketIds.length} tickets` };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Failed to update status' };
    }
}

export async function bulkAssignTechnician(ticketIds: string[], technicianId: string) {
    const session = await auth();
    if (!session?.user?.tenantId) return { success: false, message: 'Unauthorized' };

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    
    try {
        // Verify technician exists and belongs to tenant
        const tech = await db.user.findUnique({ where: { id: technicianId }});
        if (!tech || tech.tenantId !== session.user.tenantId) {
             return { success: false, message: 'Invalid technician' };
        }

        await db.ticket.updateMany({
            where: {
                id: { in: ticketIds },
                tenantId: session.user.tenantId
            },
            data: { 
                assignedToId: technicianId,
                updatedById: session.user.id
            }
        });
        revalidatePath('/dashboard/tickets');
        return { success: true, message: `Assigned ${ticketIds.length} tickets to ${tech.name || tech.email}` };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Failed to assign technician' };
    }
}

export async function bulkDeleteTickets(ticketIds: string[]) {
    const session = await auth();
    if (!session?.user?.tenantId) return { success: false, message: 'Unauthorized' };
    
    if (session.user.role !== 'ADMIN') {
        return { success: false, message: 'Only admins can delete tickets' };
    }

    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    
    try {
        await db.ticket.deleteMany({
            where: {
                id: { in: ticketIds },
                tenantId: session.user.tenantId
            }
        });
        revalidatePath('/dashboard/tickets');
        return { success: true, message: `Deleted ${ticketIds.length} tickets` };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Failed to delete tickets' };
    }
}
