import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkExpiringQuotations, alertExpiringQuotations } from '@/lib/quotation-cron';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
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
