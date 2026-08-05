import { getTenantPrisma } from '@/lib/tenant-prisma';

export class PartRepository {
  static getTenantDb(tenantId: string, userId: string) {
    return getTenantPrisma(tenantId, userId);
  }
}
