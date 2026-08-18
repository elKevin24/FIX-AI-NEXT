
import { createActionRepositories, ActionRepositories } from '@/lib/action-factory';
import { sendEmail } from '@/lib/email-service';
import { createNotification } from '@/lib/notifications';
import SLABreachEmail from '@/emails/SLABreach'; 
import { SLACheckSchema } from '@/lib/schemas';
import { prisma } from '@/lib/prisma';
import { AuditAction, AuditModule } from '@prisma/client';

export async function checkSLA(tenantId?: string) {
    console.log('Starting SLA Check...');
    
    const parsed = SLACheckSchema.parse({ tenantId });
    
    const tenants = await prisma.tenant.findMany({
        where: parsed.tenantId ? { id: parsed.tenantId } : undefined,
        include: { settings: true }
    });
    
    let checksRun = 0;
    let notificationsSent = 0;
    let emailsSent = 0;
    let auditLogsCreated = 0;

    for (const tenant of tenants) {
        if (!tenant.settings) continue;
        
        const { slaWarningPercent, slaCriticalPercent, slaEmailEnabled, slaInAppEnabled } = tenant.settings;
        
        // Inject dependencies for this tenant
        const repos = createActionRepositories(tenant.id);
        
        const tickets = await prisma.ticket.findMany({
            where: {
                tenantId: tenant.id,
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS'] },
                dueDate: { not: null },
            },
            include: {
                assignedTo: true,
            }
        });
        
        for (const ticket of tickets) {
            checksRun++;
            if (!ticket.dueDate) continue;

            const now = new Date().getTime();
            const start = new Date(ticket.createdAt).getTime();
            const end = new Date(ticket.dueDate).getTime();
            
            if (end <= start) continue;
            
            const totalDuration = end - start;
            const elapsed = now - start;
            const percentUsed = (elapsed / totalDuration) * 100;
            
            let status: 'WARNING' | 'CRITICAL' | null = null;
            
            if (percentUsed >= slaCriticalPercent) {
                status = 'CRITICAL';
            } else if (percentUsed >= slaWarningPercent) {
                status = 'WARNING';
            }
            
            if (!status) continue;
            
            // Log to audit trail when SLA threshold is breached
            const auditLogged = await logSLABreach(
                repos,
                ticket,
                status,
                percentUsed,
                tenant.id
            );
            if (auditLogged) auditLogsCreated++;
            
            // Send Email
            if (slaEmailEnabled && ticket.assignedTo?.email) {
                 await sendEmail({
                     to: ticket.assignedTo.email,
                     subject: `⚠️ SLA ${status}: Ticket #${ticket.id.slice(0, 8)}`,
                     react: SLABreachEmail({
                         ticketNumber: ticket.id.slice(0, 8),
                         title: ticket.title,
                         status,
                         timeRemaining: msToTime(end - now),
                         ticketLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/tickets/${ticket.id}`
                     })
                 });
                 emailsSent++;
            }
            
            // In-App Notification
            if (slaInAppEnabled && ticket.assignedTo?.id) {
                await createNotification({
                    userId: ticket.assignedTo.id,
                    tenantId: tenant.id,
                    title: `SLA ${status}: Ticket #${ticket.id.slice(0, 8)}`,
                    message: `Ticket "${ticket.title}" is at ${Math.round(percentUsed)}% of allowed time.`,
                    type: status === 'CRITICAL' ? 'ERROR' : 'WARNING',
                    link: `/dashboard/tickets/${ticket.id}`
                });
                notificationsSent++;
            }
        }
    }
    
    console.log(`SLA Check Complete: ${checksRun} checked, ${emailsSent} emails, ${notificationsSent} notifications, ${auditLogsCreated} audit logs.`);
    return { checksRun, notificationsSent, emailsSent, auditLogsCreated };
}

async function logSLABreach(
    repos: ActionRepositories,
    ticket: any,
    status: 'WARNING' | 'CRITICAL',
    percentUsed: number,
    tenantId: string
): Promise<boolean> {
    try {
        await repos.auditLogRepo.logAction({
            action: status === 'CRITICAL' ? AuditAction.TICKET_STATUS_CHANGED : AuditAction.TICKET_UPDATED,
            module: AuditModule.TICKETS,
            details: `SLA ${status} breach detected. Ticket at ${Math.round(percentUsed)}% of allowed time.`,
            userId: ticket.assignedToId || undefined,
            tenantId,
            entityType: 'Ticket',
            entityId: ticket.id,
            metadata: {
                ticketId: ticket.id,
                ticketNumber: ticket.id.slice(0, 8),
                title: ticket.title,
                slaStatus: status,
                percentUsed: Math.round(percentUsed),
                dueDate: ticket.dueDate?.toISOString(),
            },
            success: true,
        });
        return true;
    } catch (error) {
        console.error('Error logging SLA breach to audit trail:', error);
        return false;
    }
}

function msToTime(duration: number) {
    if (duration < 0) return "Overdue";
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
}
