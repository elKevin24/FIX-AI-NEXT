import { getTenantPrisma } from '@/lib/tenant-prisma';

export class CustomerRepository {
  static getTenantDb(tenantId: string, userId: string) {
    return getTenantPrisma(tenantId, userId);
  }
}
