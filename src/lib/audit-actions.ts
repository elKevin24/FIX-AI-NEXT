'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"; // Use global prisma for logging to avoid circular deps or scoping issues
import { AuditAction, AuditModule } from "@prisma/client";
import { headers, cookies } from "next/headers";
import { UAParser } from "ua-parser-js"; // I might need to install this or just use raw string

// Helper to get client IP
function getIp(headersList: Headers): string {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export async function logAction(
  action: AuditAction,
  auditModule: AuditModule,
  details: {
    entityType?: string;
    entityId?: string;
    metadata?: any;
    success?: boolean;
    tenantId?: string; // Optional override
    userId?: string;   // Optional override
  }
) {
  try {
    const session = await auth();
    const headersList = await headers();
    const ipAddress = getIp(headersList);
    const userAgent = headersList.get("user-agent") || "Unknown";

    let tenantId = details.tenantId;
    let userId = details.userId;

    // Fallback to session if not provided
    if (!tenantId && session?.user?.tenantId) {
      tenantId = session.user.tenantId;
    }
    if (!userId && session?.user?.id) {
      userId = session.user.id;
    }

    // If still no tenantId, we might fail or log to a system tenant if exists. 
    // For now, we require tenantId.
    if (!tenantId) {
      console.warn("AuditLog: No tenantId provided for action", action);
      return; 
    }

    await prisma.auditLog.create({
      data: {
        action,
        module: auditModule,
        entityType: details.entityType,
        entityId: details.entityId,
        metadata: details.metadata ?? {},
        ipAddress,
        userAgent,
        success: details.success ?? true,
        tenantId,
        userId,
      },
    });
  } catch (error) {
    console.error("Failed to write AuditLog:", error);
    // Do not throw, logging failure shouldn't break the app
  }
}

export async function createSession(userId: string, tenantId: string) {
    const headersList = await headers();
    const ipAddress = getIp(headersList);
    const userAgent = headersList.get("user-agent") || "Unknown";
    const sessionToken = crypto.randomUUID();

    try {
        await prisma.sessionLog.create({
            data: {
                userId,
                tenantId,
                sessionToken,
                ipAddress,
                userAgent,
                status: 'ACTIVE',
                loginAt: new Date(),
                lastActivityAt: new Date(),
            }
        });
        
        // Store in cookies for middleware tracking
        const cookiesList = await cookies();
        cookiesList.set('session_log_token', sessionToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });

        return sessionToken;
    } catch (error) {
        console.error("Failed to create session log:", error);
        return null;
    }
}

export async function endSession(sessionToken?: string, reason: string = 'LOGOUT') {
    try {
        const cookiesList = await cookies();
        const token = sessionToken || cookiesList.get('session_log_token')?.value;
        
        if (!token) return;

        await prisma.sessionLog.update({
            where: { sessionToken: token },
            data: {
                status: 'LOGGED_OUT',
                logoutAt: new Date(),
                metadata: { reason }
            }
        });

        cookiesList.delete('session_log_token');
    } catch (error) {
        console.error("Failed to end session log:", error);
    }
}

export async function updateSessionActivity(sessionToken?: string) {
    try {
        const cookiesList = await cookies();
        const token = sessionToken || cookiesList.get('session_log_token')?.value;
        
        if (!token) return;

        await prisma.sessionLog.update({
            where: { sessionToken: token },
            data: {
                lastActivityAt: new Date(),
            }
        });
    } catch (error) {
        // Silent fail
    }
}

export async function logPageAccess(pathname: string) {
  // Determine module from pathname
  let auditModule: AuditModule = 'DASHBOARD';
  if (pathname.includes('/tickets')) auditModule = 'TICKETS';
  else if (pathname.includes('/users') || pathname.includes('/technicians')) auditModule = 'USERS';
  else if (pathname.includes('/settings')) auditModule = 'SETTINGS';
  else if (pathname.includes('/reports')) auditModule = 'REPORTS';
  else if (pathname.includes('/inventory') || pathname.includes('/parts')) auditModule = 'INVENTORY';
  else if (pathname.includes('/pos') || pathname.includes('/sales')) auditModule = 'POS';
  else if (pathname.includes('/billing') || pathname.includes('/invoices')) auditModule = 'BILLING';

  await logAction('MODULE_ACCESSED', auditModule, {
    metadata: { path: pathname }
  });
}

export async function getAuditLogs(
    tenantId: string, 
    limit: number = 50,
    offset: number = 0,
    filters?: {
        userId?: string;
        action?: AuditAction;
        module?: AuditModule;
        startDate?: Date;
        endDate?: Date;
    }
) {
    const session = await auth();
    // Security check: must be same tenant or SuperAdmin (not implemented yet)
    if (session?.user?.tenantId !== tenantId && session?.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }

    const whereClause: any = { tenantId };
    if (filters?.userId) whereClause.userId = filters.userId;
    if (filters?.action) whereClause.action = filters.action;
    if (filters?.module) whereClause.module = filters.module;
    if (filters?.startDate || filters?.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    try {
        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                user: { select: { name: true, email: true } }
            }
        });
        const total = await prisma.auditLog.count({ where: whereClause });
        return { logs, total };
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return { logs: [], total: 0 };
    }
}

/**
 * Detects suspicious activity for a given IP or Email
 * Returns true if the account/IP should be throttled or alerted
 */
export async function checkSuspiciousActivity(ipAddress: string, email?: string) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // 1. Check failed logins by IP
    const failedByIp = await prisma.auditLog.count({
        where: {
            ipAddress,
            action: 'LOGIN_FAILED',
            createdAt: { gte: fifteenMinutesAgo }
        }
    });

    if (failedByIp >= 10) {
        return { suspicious: true, reason: 'TOO_MANY_FAILED_LOGINS_IP', count: failedByIp };
    }

    // 2. Check failed logins by Email
    if (email) {
        const failedByEmail = await prisma.auditLog.count({
            where: {
                metadata: { path: ['email'], equals: email }, // JSONB query
                action: 'LOGIN_FAILED',
                createdAt: { gte: fifteenMinutesAgo }
            }
        });

        if (failedByEmail >= 5) {
            return { suspicious: true, reason: 'TOO_MANY_FAILED_LOGINS_EMAIL', count: failedByEmail };
        }
    }

    return { suspicious: false };
}

/**
 * Manually trigger logs maintenance
 */
export async function runLogsMaintenance() {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') return { success: false, message: 'Unauthorized' };

    try {
        await prisma.$executeRawUnsafe(`SELECT purge_old_audit_data();`);
        return { success: true, message: 'Maintenance executed successfully' };
    } catch (error) {
        return { success: false, message: 'Failed to run maintenance' };
    }
}
