import { getTenantPrisma } from '@/lib/tenant-prisma';
import {
  IAuditLogRepository,
  AuditLogData,
} from '../interfaces/audit-log.repository.interface';
import { AuditLog } from '@prisma/client';

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly tenantId: string) {}

  private get db() {
    return getTenantPrisma(this.tenantId);
  }

  async logAction(data: AuditLogData): Promise<AuditLog> {
    return this.db.auditLog.create({
      data: {
        action: data.action,
        module: data.module,
        details: data.details,
        userId: data.userId,
        tenantId: this.tenantId,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
        success: data.success ?? true,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    filters?: {
      module?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLog[]> {
    const where: any = { tenantId };

    if (filters?.module) where.module = filters.module;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return this.db.auditLog.findMany({
      where,
      skip: filters?.offset || 0,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.db.auditLog.findUnique({
      where: { id },
    });
  }
}
