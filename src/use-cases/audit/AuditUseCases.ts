import { prisma } from "@/lib/prisma";
import { AuditAction, AuditModule } from "@prisma/client";

export class LogActionUseCase {
  static async execute(
    action: AuditAction,
    auditModule: AuditModule,
    details: {
      entityType?: string;
      entityId?: string;
      metadata?: any;
      success?: boolean;
      tenantId: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    return await prisma.auditLog.create({
      data: {
        action,
        module: auditModule,
        entityType: details.entityType,
        entityId: details.entityId,
        metadata: details.metadata ?? {},
        ipAddress: details.ipAddress || "127.0.0.1",
        userAgent: details.userAgent || "Unknown",
        success: details.success ?? true,
        tenantId: details.tenantId,
        userId: details.userId,
      },
    });
  }
}

export class CreateSessionLogUseCase {
  static async execute(data: {
    userId: string;
    tenantId: string;
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
  }) {
    return await prisma.sessionLog.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        sessionToken: data.sessionToken,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: 'ACTIVE',
        loginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }
}

export class EndSessionLogUseCase {
  static async execute(token: string, reason: string = 'LOGOUT') {
    return await prisma.sessionLog.update({
      where: { sessionToken: token },
      data: {
        status: 'LOGGED_OUT',
        logoutAt: new Date(),
        metadata: { reason },
      },
    });
  }
}

export class UpdateSessionActivityUseCase {
  static async execute(token: string) {
    return await prisma.sessionLog.update({
      where: { sessionToken: token },
      data: {
        lastActivityAt: new Date(),
      },
    });
  }
}

export class GetAuditLogsUseCase {
  static async execute(
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
    const whereClause: any = { tenantId };
    if (filters?.userId) whereClause.userId = filters.userId;
    if (filters?.action) whereClause.action = filters.action;
    if (filters?.module) whereClause.module = filters.module;
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return { logs, total };
  }
}

export class CheckSuspiciousActivityUseCase {
  static async execute(ipAddress: string, email?: string) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const failedByIp = await prisma.auditLog.count({
      where: {
        ipAddress,
        action: 'LOGIN_FAILED',
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (failedByIp >= 10) {
      return { suspicious: true, reason: 'TOO_MANY_FAILED_LOGINS_IP', count: failedByIp };
    }

    if (email) {
      const failedByEmail = await prisma.auditLog.count({
        where: {
          metadata: { path: ['email'], equals: email },
          action: 'LOGIN_FAILED',
          createdAt: { gte: fifteenMinutesAgo },
        },
      });

      if (failedByEmail >= 5) {
        return { suspicious: true, reason: 'TOO_MANY_FAILED_LOGINS_EMAIL', count: failedByEmail };
      }
    }

    return { suspicious: false };
  }
}

export class RunLogsMaintenanceUseCase {
  static async execute() {
    await prisma.$executeRaw`SELECT purge_old_audit_data();`;
    return { success: true, message: 'Maintenance executed successfully' };
  }
}
