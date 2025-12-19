'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

interface CreateNotificationParams {
    userId: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

export async function getMyNotifications() {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.tenantId) {
        return [];
    }
    return getUnreadNotifications(session.user.id, session.user.tenantId);
}

export async function markMyNotificationAsRead(id: string) {
     const session = await auth();
     if (!session?.user?.id) return;
     await markNotificationAsRead(id, session.user.id);
}

export async function markAllMyNotificationsAsRead() {
     const session = await auth();
     if (!session?.user?.id || !session?.user?.tenantId) return;
     await markAllNotificationsAsRead(session.user.id, session.user.tenantId);
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        await prisma.notification.create({
            data: {
                userId: params.userId,
                tenantId: params.tenantId,
                type: params.type,
                title: params.title,
                message: params.message,
                link: params.link,
            }
        });
        // We can't easily revalidate the specific user's view if we are in a server action triggered by someone else?
        // But if the user is viewing their notifications, revalidatePath might help?
        // usually notifications are polished by client side polling or real-time.
        // For now, no revalidatePath here as it might not be relevant path.
    } catch (error) {
        console.error('Failed to create notification', error);
    }
}

export async function getUnreadNotifications(userId: string, tenantId: string) {
    try {
        return await prisma.notification.findMany({
            where: {
                userId,
                tenantId,
                isRead: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });
    } catch (error) {
        console.error('Failed to get notifications', error);
        return [];
    }
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
    try {
        await prisma.notification.update({
            where: {
                id: notificationId,
                userId: userId, // Ensure ownership
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/dashboard'); // Assuming bell is in layout
    } catch (error) {
        console.error('Failed to mark notification as read', error);
    }
}

export async function markAllNotificationsAsRead(userId: string, tenantId: string) {
    try {
        await prisma.notification.updateMany({
            where: {
                userId,
                tenantId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/dashboard');
    } catch (error) {
        console.error('Failed to mark all notifications as read', error);
    }
}
