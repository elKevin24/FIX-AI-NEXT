import { prisma } from '@/lib/prisma';
import { AuditAction, AuditModule, QuotationStatus } from '@prisma/client';

export interface ExpirationResult {
  tenantId: string;
  expiredCount: number;
}

export async function checkExpiringQuotations(tenantId: string): Promise<ExpirationResult> {
  const now = new Date();

  const expiredQuotations = await prisma.pOSQuotation.findMany({
    where: {
      tenantId,
      status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT] },
      validUntil: { lt: now },
    },
    select: { id: true, quotationNumber: true },
  });

  if (expiredQuotations.length === 0) {
    return { tenantId, expiredCount: 0 };
  }

  const ids = expiredQuotations.map(q => q.id);

  await prisma.pOSQuotation.updateMany({
    where: { id: { in: ids } },
    data: { status: QuotationStatus.EXPIRED },
  });

  for (const q of expiredQuotations) {
    await prisma.auditLog.create({
      data: {
        action: AuditAction.TICKET_STATUS_CHANGED,
        module: AuditModule.POS,
        entityType: 'QUOTATION',
        entityId: q.id,
        metadata: {
          quotationNumber: q.quotationNumber,
          previousStatus: 'DRAFT/SENT',
          newStatus: QuotationStatus.EXPIRED,
          reason: 'VALID_UNTIL_EXCEEDED',
        },
        tenantId,
        success: true,
      },
    });
  }

  return { tenantId, expiredCount: expiredQuotations.length };
}
