
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const settings = await prisma.tenantSettings.findMany({
            where: { OR: [{ slaEmailEnabled: true }, { slaInAppEnabled: true }] }
        });

        let notificationsSent = 0;

        for (const setting of settings) {
            const tickets = await prisma.ticket.findMany({
                where: {
                    tenantId: setting.tenantId,
                    status: { notIn: ['CLOSED', 'DELIVERED', 'CANCELLED', 'RESOLVED'] },
                    dueDate: { not: null },
                    assignedToId: { not: null } // Only notify assigned
                },
                include: { assignedTo: true }
            });

            for (const ticket of tickets) {
                if (!ticket.dueDate || !ticket.assignedTo) continue;
                
                const now = new Date();
                const due = new Date(ticket.dueDate);
                const createdAt = new Date(ticket.createdAt);
                
                const totalDuration = due.getTime() - createdAt.getTime();
                const elapsed = now.getTime() - createdAt.getTime();
                const percentage = (elapsed / totalDuration) * 100;

                const isCritical = percentage >= setting.slaCriticalPercent;
                const isWarning = percentage >= setting.slaWarningPercent && !isCritical;

                if (!isCritical && !isWarning) continue;

                // Check recent notification to avoid spam
                const exist = await prisma.notification.findFirst({
                    where: {
                        userId: ticket.assignedTo.id,
                        link: { contains: ticket.id },
                        title: { contains: isCritical ? 'CRÍTICO' : 'Advertencia' },
                        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Once per 24h for same level
                    }
                });

                if (exist) continue; 

                const title = `SLA ${isCritical ? 'CRÍTICO' : 'Advertencia'}: ${ticket.ticketNumber || ticket.title}`;
                const message = `El ticket (ID: ${ticket.ticketNumber}) ha consumido el ${percentage.toFixed(0)}% del tiempo asignado. Vence: ${due.toLocaleDateString()}`;

                // Email
                if (setting.slaEmailEnabled && ticket.assignedTo.email) {
                    await sendEmail({
                        to: ticket.assignedTo.email,
                        subject: `[FIX-AI] ${title}`,
                        text: message
                    });
                }

                // In-App
                if (setting.slaInAppEnabled) {
                    await prisma.notification.create({
                        data: {
                            userId: ticket.assignedTo.id,
                            tenantId: setting.tenantId,
                            type: isCritical ? 'SLA_CRITICAL' : 'SLA_WARNING',
                            title: title,
                            message: message,
                            link: `/dashboard/tickets/${ticket.id}`
                        }
                    });
                }
                notificationsSent++;
            }
        }
        
        return NextResponse.json({ success: true, notificationsSent });
    } catch (error: any) {
        console.error('SLA Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
