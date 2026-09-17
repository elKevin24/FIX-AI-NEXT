'use server';

/**
 * Audit Server Actions (Thin Controller)
 * Delegating logging, session tracking and security checks to AuditUseCases.
 */

import { auth } from "@/auth";
import { AuditAction, AuditModule } from "@prisma/client";
import { headers, cookies } from "next/headers";
import {
  LogActionUseCase,
  CreateSessionLogUseCase,
  EndSessionLogUseCase,
  UpdateSessionActivityUseCase,
  GetAuditLogsUseCase,
  CheckSuspiciousActivityUseCase,
  RunLogsMaintenanceUseCase,
} from "@/use-cases/audit";

function getIp(headersList: Headers): string {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return (forwardedFor.split(",")[0] || "127.0.0.1").trim();
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
    tenantId?: string;
    userId?: string;
  }
) {
  try {
    const session = await auth();
    const headersList = await headers();
    const ipAddress = getIp(headersList);
    const userAgent = headersList.get("user-agent") || "Unknown";

    let tenantId = details.tenantId;
    let userId = details.userId;

    if (!tenantId && session?.user?.tenantId) {
      tenantId = session.user.tenantId;
    }
    if (!userId && session?.user?.id) {
      userId = session.user.id;
    }

    if (!tenantId) {
      console.warn("AuditLog: No tenantId provided for action %s", String(action).replace(/[\r\n]/g, ''));
      return; 
    }

    await LogActionUseCase.execute(action, auditModule, {
      ...details,
      tenantId,
      userId,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to write AuditLog:", error);
  }
}

export async function createSession(userId: string, tenantId: string) {
  const headersList = await headers();
  const ipAddress = getIp(headersList);
  const userAgent = headersList.get("user-agent") || "Unknown";
  const sessionToken = crypto.randomUUID();

  try {
    await CreateSessionLogUseCase.execute({
      userId,
      tenantId,
      sessionToken,
      ipAddress,
      userAgent,
    });
    
    const cookiesList = await cookies();
    cookiesList.set('session_log_token', sessionToken, { 
      httpOnly: true, 
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
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

    await EndSessionLogUseCase.execute(token, reason);
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

    await UpdateSessionActivityUseCase.execute(token);
  } catch (error) {
    // Silent fail
  }
}

export async function logPageAccess(pathname: string) {
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
  if (session?.user?.tenantId !== tenantId && session?.user?.role !== 'ADMIN') {
    throw new Error("Unauthorized");
  }

  try {
    return await GetAuditLogsUseCase.execute(tenantId, limit, offset, filters);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], total: 0 };
  }
}

export async function checkSuspiciousActivity(ipAddress: string, email?: string) {
  return await CheckSuspiciousActivityUseCase.execute(ipAddress, email);
}

export async function runLogsMaintenance() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') return { success: false, message: 'Unauthorized' };

  try {
    return await RunLogsMaintenanceUseCase.execute();
  } catch (error) {
    return { success: false, message: 'Failed to run maintenance' };
  }
}
