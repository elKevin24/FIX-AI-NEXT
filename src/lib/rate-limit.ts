import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redisClient: Redis | null = null;
if (process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN']) {
  redisClient = new Redis({
    url: process.env['UPSTASH_REDIS_REST_URL'],
    token: process.env['UPSTASH_REDIS_REST_TOKEN'],
  });
}

interface MemoryRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryRecord>();

/**
 * Universal rate-limiting helper with Upstash Redis and in-memory fallback.
 */
export async function checkActionRateLimit(
  identifier: string,
  prefix: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900 // Default: 15 minutes
): Promise<{ success: boolean; retryAfter?: number }> {
  const key = `${prefix}:${identifier}`;

  if (redisClient) {
    try {
      const limiter = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(maxAttempts, `${windowSeconds} s` as any),
        analytics: true,
        prefix: '@fix/ratelimit',
      });
      const result = await limiter.limit(key);
      return {
        success: result.success,
        retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch (e) {
      console.warn('[RateLimit] Upstash error, falling back to memory:', e);
    }
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (record.count >= maxAttempts) {
    return {
      success: false,
      retryAfter: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count++;
  return { success: true };
}
