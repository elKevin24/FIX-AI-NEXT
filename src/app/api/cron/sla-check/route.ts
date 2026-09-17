import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const settings = await prisma.tenantSettings.findMany({
            where: { OR: [{ slaEmailEnabled: true }, { slaInAppEnabled: true }] },
        });

        let notificationsSent = 0;

        for (const setting of settings) {
            const overdueTickets = await prisma.ticket.findMany({
                where: {
                    tenantId: setting.tenantId,
                    status: { notIn: ['CLOSED', 'CANCELLED', 'RESOLVED'] },
                    dueDate: { not: null },
                    assignedToId: { not: null },
                },
                include: { assignedTo: true },
            });

            for (const ticket of overdueTickets) {
                if (!ticket.dueDate || !ticket.assignedTo) continue;

                try {
                    const now = new Date();
                    const due = new Date(ticket.dueDate);
                    const createdAt = new Date(ticket.createdAt);

                    const totalDuration = due.getTime() - createdAt.getTime();
                    if (totalDuration <= 0) continue;

                    const elapsed = now.getTime() - createdAt.getTime();
                    const consumptionPercentage = (elapsed / totalDuration) * 100;

                    const isCritical = consumptionPercentage >= setting.slaCriticalPercent;
                    const isWarning =
                        consumptionPercentage >= setting.slaWarningPercent && !isCritical;

                    if (!isCritical && !isWarning) continue;

                    // Deduplicate notification to prevent spam within 24 hours
                    const existingNotification = await prisma.notification.findFirst({
                        where: {
                            userId: ticket.assignedTo.id,
                            link: { contains: ticket.id },
                            title: { contains: isCritical ? 'CRÍTICO' : 'Advertencia' },
                            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                        },
                    });

                    if (existingNotification) continue;

                    const title = `SLA ${isCritical ? 'CRÍTICO' : 'Advertencia'}: ${ticket.ticketNumber || ticket.title}`;
                    const message = `El ticket (ID: ${ticket.ticketNumber}) ha consumido el ${consumptionPercentage.toFixed(0)}% del tiempo asignado. Vence: ${due.toLocaleDateString('es-GT')}`;

                    // Email notification
                    if (setting.slaEmailEnabled && ticket.assignedTo.email) {
                        await sendEmail({
                            to: ticket.assignedTo.email,
                            subject: `[FIX-AI] ${title}`,
                            text: message,
                        });
                    }

                    // In-App notification
                    if (setting.slaInAppEnabled) {
                        await prisma.notification.create({
                            data: {
                                userId: ticket.assignedTo.id,
                                tenantId: setting.tenantId,
                                type: isCritical ? 'SLA_CRITICAL' : 'SLA_WARNING',
                                title,
                                message,
                                link: `/dashboard/tickets/${ticket.id}`,
                            },
                        });
                    }
                    notificationsSent++;
                } catch (ticketError) {
                    console.error(`[SLACheck] Failed processing SLA for ticket ${ticket.id}:`, ticketError);
                }
            }
        }

        return NextResponse.json({ success: true, notificationsSent });
    } catch (error) {
        console.error('[SLACheck] SLA Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
