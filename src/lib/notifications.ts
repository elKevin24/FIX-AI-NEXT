'use server';

import { getTenantPrisma } from '@/lib/tenant-prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { NotificationFilterSchema, NotificationIdSchema } from '@/lib/schemas';

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

export async function getAllMyNotifications(page = 1, limit = 20) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.tenantId) {
        return { notifications: [], total: 0, totalPages: 0 };
    }
    
    // Zod validation
    const parsed = NotificationFilterSchema.parse({ page, limit });
    
    const db = getTenantPrisma(session.user.tenantId, session.user.id);
    const skip = (parsed.page - 1) * parsed.limit;
    
    try {
        const [notifications, total] = await Promise.all([
            db.notification.findMany({
                where: {
                    userId: session.user.id,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: parsed.limit,
                skip: skip,
            }),
            db.notification.count({
                where: {
                    userId: session.user.id,
                }
            })
        ]);
        
        return { 
            notifications, 
            total, 
            totalPages: Math.ceil(total / parsed.limit) 
        };
    } catch (error) {
        console.error('Failed to get all notifications', error);
        return { notifications: [], total: 0, totalPages: 0 };
    }
}

export async function markMyNotificationAsRead(id: string) {
     const session = await auth();
     if (!session?.user?.id || !session?.user?.tenantId) return;
     
     const parsed = NotificationIdSchema.parse({ id });
     await markNotificationAsRead(parsed.id, session.user.id, session.user.tenantId);
}

export async function markAllMyNotificationsAsRead() {
     const session = await auth();
     if (!session?.user?.id || !session?.user?.tenantId) return;
     await markAllNotificationsAsRead(session.user.id, session.user.tenantId);
}

export async function deleteMyNotification(id: string) {
     const session = await auth();
     if (!session?.user?.id || !session?.user?.tenantId) return;
     
     const parsed = NotificationIdSchema.parse({ id });
     const db = getTenantPrisma(session.user.tenantId, session.user.id);
     
     try {
        await db.notification.delete({
            where: {
                id: parsed.id,
                userId: session.user.id, // Ensure ownership
            }
        });
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/notifications');
     } catch (error) {
         console.error('Failed to delete notification', error);
     }
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        // Internal server call, assuming params are trusted or pre-validated by callers
        const db = getTenantPrisma(params.tenantId, params.userId);
        await db.notification.create({
            data: {
                userId: params.userId,
                tenantId: params.tenantId,
                type: params.type,
                title: params.title,
                message: params.message,
                link: params.link,
            }
        });
    } catch (error) {
        console.error('Failed to create notification', error);
    }
}

export async function getUnreadNotifications(userId: string, tenantId: string) {
    try {
        const db = getTenantPrisma(tenantId, userId);
        return await db.notification.findMany({
            where: {
                userId,
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

export async function markNotificationAsRead(notificationId: string, userId: string, tenantId: string) {
    try {
        const db = getTenantPrisma(tenantId, userId);
        await db.notification.update({
            where: {
                id: notificationId,
                userId: userId, // Ensure ownership
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/dashboard'); 
        revalidatePath('/dashboard/notifications');
    } catch (error) {
        console.error('Failed to mark notification as read', error);
    }
}

export async function markAllNotificationsAsRead(userId: string, tenantId: string) {
    try {
        const db = getTenantPrisma(tenantId, userId);
        await db.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/notifications');
    } catch (error) {
        console.error('Failed to mark all notifications as read', error);
    }
}