'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PresenceStatus } from "@prisma/client";
import { headers } from "next/headers";

export async function updatePresence(
    currentRoute: string,
    currentPage: string,
    currentTicketId?: string | null,
    metadata?: any
) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.tenantId) return;

    try {
        await prisma.userPresence.upsert({
            where: { userId: session.user.id },
            create: {
                userId: session.user.id,
                tenantId: session.user.tenantId,
                status: 'ONLINE',
                currentRoute,
                currentPage,
                currentTicketId,
                lastSeenAt: new Date(),
                metadata: metadata ?? {}
            },
            update: {
                currentRoute,
                currentPage,
                currentTicketId,
                lastSeenAt: new Date(),
                metadata: metadata ? metadata : undefined, // Only update if provided? Or merge?
                status: 'ONLINE' // Auto set to online on ping
            }
        });
    } catch (error) {
        console.error("Failed to update presence:", error);
    }
}

export async function setUserStatus(status: PresenceStatus) {
    const session = await auth();
    if (!session?.user?.id) return;

    try {
        await prisma.userPresence.update({
            where: { userId: session.user.id },
            data: { status, lastSeenAt: new Date() }
        });
    } catch (error) {
        console.error("Failed to set user status:", error);
    }
}

export async function getOnlineUsers(tenantId?: string) {
    // 2 minutes threshold
    const threshold = new Date(Date.now() - 2 * 60 * 1000);
    const session = await auth();

    const targetTenantId = tenantId || session?.user?.tenantId;
    if (!targetTenantId) return [];

    try {
        const users = await prisma.userPresence.findMany({
            where: {
                tenantId: targetTenantId,
                lastSeenAt: { gt: threshold },
                status: { not: 'OFFLINE' }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        // avatar?
                    }
                }
            },
            orderBy: { lastSeenAt: 'desc' }
        });
        return users;
    } catch (error) {
        console.error("Failed to get online users:", error);
        return [];
    }
}

export async function getUsersOnTicket(ticketId: string, tenantId: string) {
    // 2 minutes threshold
    const threshold = new Date(Date.now() - 2 * 60 * 1000);

    try {
        const users = await prisma.userPresence.findMany({
            where: {
                tenantId,
                currentTicketId: ticketId,
                lastSeenAt: { gt: threshold },
                status: { not: 'OFFLINE' }
            },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        });
        return users;
    } catch (error) {
        return [];
    }
}
