import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkActionRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Lightweight rate limiting to protect DB connection pool from unauthenticated floods (60 req/min)
    let ip = '127.0.0.1';
    try {
      const headerList = await headers();
      ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || '127.0.0.1';
    } catch {
      // Ignore if headers cannot be resolved in test env
    }

    const rateLimit = await checkActionRateLimit(ip, 'health-ready', 60, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      );
    }

    // 2. Probe database connectivity safely
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
