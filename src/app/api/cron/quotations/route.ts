import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkExpiringQuotations, alertExpiringQuotations } from '@/lib/quotation-cron';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function isValidCronAuth(header: string | null): boolean {
    const secret = process.env['CRON_SECRET'];
    if (!header || !secret) return false;
    const expected = `Bearer ${secret}`;
    const headerBuf = Buffer.from(header);
    const expectedBuf = Buffer.from(expected);
    if (headerBuf.length !== expectedBuf.length) {
        crypto.timingSafeEqual(headerBuf, headerBuf);
        return false;
    }
    return crypto.timingSafeEqual(headerBuf, expectedBuf);
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!isValidCronAuth(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true },
    });

    let totalExpired = 0;
    let totalAlerted = 0;

    for (const tenant of tenants) {
      const expired = await checkExpiringQuotations(tenant.id);
      totalExpired += expired.expiredCount;

      const alerted = await alertExpiringQuotations(tenant.id);
      totalAlerted += alerted.alertedCount;
    }

    return NextResponse.json({
      success: true,
      expired: totalExpired,
      alerted: totalAlerted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Quotation Cron Error:', message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
