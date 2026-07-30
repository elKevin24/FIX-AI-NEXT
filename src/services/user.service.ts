import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/auth-helpers";

export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';

export async function getUsers() {
    const tenantId = await getTenantId();

    return await prisma.user.findMany({
        where: {
            tenantId: tenantId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            // Exclude password
        }
    });
}

export async function getUserById(id: string) {
    const tenantId = await getTenantId();

    return await prisma.user.findFirst({
        where: {
            id,
            tenantId, // Ensure we only find users in the current tenant
        },
    });
}

export async function createUser(data: { name: string; email: string; role: UserRole; password?: string }) {
    const tenantId = await getTenantId();

    // Note: Password hashing should be handled here or in the caller. 
    // For now assuming it's handled or we set a default.

    return await prisma.user.create({
        data: {
            ...data,
            password: data.password || "temp_password_hash", // Placeholder
            tenantId,
        },
    });
}
