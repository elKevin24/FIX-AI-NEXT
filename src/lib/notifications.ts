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

export async function getAllMyNotifications(page = 1, limit = 20) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.tenantId) {
        return { notifications: [], total: 0, totalPages: 0 };
    }
    
    const skip = (page - 1) * limit;
    
    try {
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: {
                    userId: session.user.id,
                    tenantId: session.user.tenantId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                skip: skip,
            }),
            prisma.notification.count({
                where: {
                    userId: session.user.id,
                    tenantId: session.user.tenantId,
                }
            })
        ]);
        
        return { 
            notifications, 
            total, 
            totalPages: Math.ceil(total / limit) 
        };
    } catch (error) {
        console.error('Failed to get all notifications', error);
        return { notifications: [], total: 0, totalPages: 0 };
    }
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

export async function deleteMyNotification(id: string) {
     const session = await auth();
     if (!session?.user?.id) return;
     
     try {
        await prisma.notification.delete({
            where: {
                id: id,
                userId: session.user.id,
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
        // Note: We don't revalidatePath here as it's often triggered from background actions
        // and specific user revalidation is tricky.
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
        revalidatePath('/dashboard'); 
        revalidatePath('/dashboard/notifications');
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
        revalidatePath('/dashboard/notifications');
    } catch (error) {
        console.error('Failed to mark all notifications as read', error);
    }
}