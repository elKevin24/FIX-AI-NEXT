import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down' | 'not_configured';
  };
  latencyMs: {
    database: number;
    redis?: number;
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthResponse['checks'] = {
    database: 'down',
    redis: 'not_configured',
  };
  const latencyMs: HealthResponse['latencyMs'] = {
    database: 0,
  };

  let isDatabaseOk = false;

  // 1. Database Health Check with timeout
  const dbStart = performance.now();
  try {
    const dbTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 3000)
    );
    const dbQuery = prisma.$queryRaw`SELECT 1`;
    await Promise.race([dbQuery, dbTimeout]);
    checks.database = 'up';
    isDatabaseOk = true;
    latencyMs.database = Math.round(performance.now() - dbStart);
  } catch (err) {
    console.error('[HealthCheck] Database check failed:', err);
    checks.database = 'down';
    latencyMs.database = Math.round(performance.now() - dbStart);
  }

  // 2. Redis Health Check (if configured)
  const redisUrl = process.env['UPSTASH_REDIS_REST_URL'];
  const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (redisUrl && redisToken) {
    const redisStart = performance.now();
    try {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      const redisTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      );
      await Promise.race([redis.ping(), redisTimeout]);
      checks.redis = 'up';
      latencyMs.redis = Math.round(performance.now() - redisStart);
    } catch (err) {
      console.error('[HealthCheck] Redis check failed:', err);
      checks.redis = 'down';
      latencyMs.redis = Math.round(performance.now() - redisStart);
    }
  }

  // Determine overall status
  let overallStatus: HealthResponse['status'] = 'healthy';
  let httpStatus = 200;

  if (!isDatabaseOk) {
    overallStatus = 'unhealthy';
    httpStatus = 503;
  } else if (checks.redis === 'down') {
    overallStatus = 'degraded';
    // Return 200 for degraded if DB works, since app has in-memory rate limiting fallback
    httpStatus = 200;
  }

  const responseBody: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    checks,
    latencyMs,
  };

  return NextResponse.json(responseBody, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
