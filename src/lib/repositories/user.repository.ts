import { getTenantPrisma } from '@/lib/tenant-prisma';

export class UserRepository {
  static getTenantDb(tenantId: string, userId: string) {
    return getTenantPrisma(tenantId, userId);
  }
}
