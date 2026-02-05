import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function getAuditLogs(tenantId?: string, limit: number = 50, offset: number = 0, filters?: any) {
  const session = await auth();
  const targetTenantId = tenantId || session?.user?.tenantId;
  
  if (!targetTenantId) return { logs: [], total: 0 };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        tenantId: targetTenantId,
        ...(filters?.action ? { action: filters.action } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({
      where: {
        tenantId: targetTenantId,
        ...(filters?.action ? { action: filters.action } : {}),
      }
    })
  ]);

  return { logs, total };
}