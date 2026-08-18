import { AuditLog, AuditAction, AuditModule } from '@prisma/client';

export interface AuditLogData {
  action: AuditAction;
  module: AuditModule;
  details?: string;
  userId?: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
}

export interface IAuditLogRepository {
  /**
   * Logs an action to the audit trail
   */
  logAction(data: AuditLogData): Promise<AuditLog>;

  /**
   * Retrieves audit logs for a tenant with optional filters
   */
  findByTenant(
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
  ): Promise<AuditLog[]>;

  /**
   * Retrieves a specific audit log by ID
   */
  findById(id: string): Promise<AuditLog | null>;
}
