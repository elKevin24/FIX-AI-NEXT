
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: Request): boolean {
    const cronSecret = process.env['CRON_SECRET'];
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || !authHeader) return false;

    const expectedHeader = `Bearer ${cronSecret}`;
    const headerHash = crypto.createHash('sha256').update(authHeader).digest();
    const expectedHash = crypto.createHash('sha256').update(expectedHeader).digest();

    return crypto.timingSafeEqual(headerHash, expectedHash);
}

export async function GET(request: Request) {
    if (!isAuthorizedCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const settings = await prisma.tenantSettings.findMany({
            where: { OR: [{ slaEmailEnabled: true }, { slaInAppEnabled: true }] }
        });

        let notificationsSent = 0;

        for (const setting of settings) {
            const tickets = await prisma.ticket.findMany({
                where: {
                    tenantId: setting.tenantId,
                    status: { notIn: ['CLOSED', 'CANCELLED', 'RESOLVED'] },
                    dueDate: { not: null },
                    assignedToId: { not: null }
                },
                include: { assignedTo: true }
            });

            if (tickets.length === 0) continue;

            const userIds = Array.from(new Set(tickets.map(t => t.assignedToId).filter(Boolean))) as string[];

            // Batch query: traer notificaciones de las últimas 24h en 1 sola consulta
            const recentNotifications = await prisma.notification.findMany({
                where: {
                    tenantId: setting.tenantId,
                    userId: { in: userIds },
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                },
                select: {
                    userId: true,
                    link: true,
                    title: true
                }
            });

            const sentNotificationKeys = new Set(
                recentNotifications.map(n => `${n.userId}:${n.link || ''}:${n.title.includes('CRÍTICO') ? 'CRITICAL' : 'WARNING'}`)
            );

            const inAppToCreate: Array<{
                userId: string;
                tenantId: string;
                type: string;
                title: string;
                message: string;
                link: string;
            }> = [];

            const emailPromises: Array<Promise<any>> = [];

            const now = new Date();

            for (const ticket of tickets) {
                if (!ticket.dueDate || !ticket.assignedTo) continue;

                const due = new Date(ticket.dueDate);
                const createdAt = new Date(ticket.createdAt);

                const totalDuration = due.getTime() - createdAt.getTime();
                if (totalDuration <= 0) continue;

                const elapsed = now.getTime() - createdAt.getTime();
                const percentage = (elapsed / totalDuration) * 100;

                const isCritical = percentage >= setting.slaCriticalPercent;
                const isWarning = percentage >= setting.slaWarningPercent && !isCritical;

                if (!isCritical && !isWarning) continue;

                const severityKey = isCritical ? 'CRITICAL' : 'WARNING';
                const notifKey = `${ticket.assignedTo.id}:/dashboard/tickets/${ticket.id}:${severityKey}`;

                if (sentNotificationKeys.has(notifKey)) continue;
                sentNotificationKeys.add(notifKey);

                const title = `SLA ${isCritical ? 'CRÍTICO' : 'Advertencia'}: ${ticket.ticketNumber || ticket.title}`;
                const message = `El ticket (ID: ${ticket.ticketNumber || ticket.id.substring(0, 8)}) ha consumido el ${percentage.toFixed(0)}% del tiempo asignado. Vence: ${due.toLocaleDateString()}`;

                // Enviar correo
                if (setting.slaEmailEnabled && ticket.assignedTo.email) {
                    emailPromises.push(
                        sendEmail({
                            to: ticket.assignedTo.email,
                            subject: `[FIX-AI] ${title}`,
                            text: message
                        }).catch(err => console.error(`Error enviando SLA email a ${ticket.assignedTo?.email}:`, err))
                    );
                }

                // In-App batching
                if (setting.slaInAppEnabled) {
                    inAppToCreate.push({
                        userId: ticket.assignedTo.id,
                        tenantId: setting.tenantId,
                        type: isCritical ? 'SLA_CRITICAL' : 'SLA_WARNING',
                        title: title,
                        message: message,
                        link: `/dashboard/tickets/${ticket.id}`
                    });
                }

                notificationsSent++;
            }

            if (inAppToCreate.length > 0) {
                await prisma.notification.createMany({
                    data: inAppToCreate
                });
            }

            if (emailPromises.length > 0) {
                await Promise.allSettled(emailPromises);
            }
        }

        return NextResponse.json({ success: true, notificationsSent });
    } catch (error: any) {
        console.error('SLA Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
