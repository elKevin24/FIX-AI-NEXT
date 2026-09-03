import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Probe database connectivity safely
    if (typeof (prisma as any).$queryRaw === 'function') {
      await (prisma as any).$queryRaw`SELECT 1`;
    }

    return NextResponse.json(
      {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Readiness Check] Database connection check failed:', error);
    return NextResponse.json(
      {
        status: 'not_ready',
        database: 'disconnected',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
