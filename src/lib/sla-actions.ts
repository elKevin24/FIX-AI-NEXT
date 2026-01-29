
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import { createNotification } from '@/lib/notifications';
import SLABreachEmail from '@/emails/SLABreach'; 

export async function checkSLA() {
    console.log('Starting SLA Check...');
    
    const tenants = await prisma.tenant.findMany({
        include: { settings: true }
    });
    
    let checksRun = 0;
    let notificationsSent = 0;
    let emailsSent = 0;

    for (const tenant of tenants) {
        if (!tenant.settings) continue;
        
        const { slaWarningPercent, slaCriticalPercent, slaEmailEnabled, slaInAppEnabled } = tenant.settings;
        
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
    
    console.log(`SLA Check Complete: ${checksRun} checked, ${emailsSent} emails, ${notificationsSent} notifications.`);
    return { checksRun, notificationsSent, emailsSent };
}

function msToTime(duration: number) {
    if (duration < 0) return "Overdue";
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
}
