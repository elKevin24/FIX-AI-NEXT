import { prisma } from '@/lib/prisma';
import { AuditAction, AuditModule, QuotationStatus } from '@prisma/client';

export interface ExpirationResult {
  tenantId: string;
  expiredCount: number;
}

export interface ExpirationAlertResult {
  tenantId: string;
  alertedCount: number;
}

const ALERT_WINDOW_MS = 48 * 60 * 60 * 1000;

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

export async function alertExpiringQuotations(tenantId: string): Promise<ExpirationAlertResult> {
  const now = new Date();
  const threshold = new Date(now.getTime() + ALERT_WINDOW_MS);

  const expiringQuotations = await prisma.pOSQuotation.findMany({
    where: {
      tenantId,
      status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT] },
      validUntil: { gt: now, lte: threshold },
    },
    select: {
      id: true,
      quotationNumber: true,
      customerName: true,
      total: true,
      validUntil: true,
      createdById: true,
    },
  });

  if (expiringQuotations.length === 0) {
    return { tenantId, alertedCount: 0 };
  }

  let alertedCount = 0;

  for (const q of expiringQuotations) {
    const link = `/dashboard/pos/quotations`;

    const existing = await prisma.notification.findFirst({
      where: {
        userId: q.createdById,
        tenantId,
        type: 'QUOTATION_EXPIRING',
        link,
        title: { contains: q.quotationNumber },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) continue;

    const hoursLeft = Math.round(
      ((q.validUntil?.getTime() ?? 0) - now.getTime()) / (60 * 60 * 1000)
    );

    await prisma.notification.create({
      data: {
        userId: q.createdById,
        tenantId,
        type: 'QUOTATION_EXPIRING',
        title: `Cotización por vencer: ${q.quotationNumber}`,
        message: `La cotización ${q.quotationNumber} de ${q.customerName} vence en ${hoursLeft}h. Total: Q${Number(q.total).toFixed(2)}`,
        link,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.TICKET_STATUS_CHANGED,
        module: AuditModule.POS,
        entityType: 'QUOTATION',
        entityId: q.id,
        metadata: {
          quotationNumber: q.quotationNumber,
          customerName: q.customerName,
          validUntil: q.validUntil?.toISOString(),
          hoursUntilExpiration: hoursLeft,
          reason: 'EXPIRATION_ALERT_48H',
        },
        tenantId,
        success: true,
      },
    });

    alertedCount++;
  }

  return { tenantId, alertedCount };
}
