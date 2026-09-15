/**
 * Next.js Middleware
 *
 * Handles:
 * - Authentication protection for dashboard routes
 * - Redirect to password change page if passwordMustChange is true
 * - Basic rate limiting for login endpoint
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// --- CONFIGURATION ---
const DASHBOARD_PATH = '/dashboard';
const LOGIN_PATH = '/login';
const CHANGE_PASSWORD_PATH = '/dashboard/profile/change-password';

// --- RATE LIMITING ---
// Upstash Redis (Distributed, DDoS protection)
let redisRatelimitAuth: Ratelimit | null = null;
let redisRatelimitSearch: Ratelimit | null = null;

if (process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN']) {
  const redis = new Redis({
    url: process.env['UPSTASH_REDIS_REST_URL'],
    token: process.env['UPSTASH_REDIS_REST_TOKEN'],
  });
  
  // Login limit: 10 requests per 1 minute
  redisRatelimitAuth = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  });

  // Search limit: 30 requests per 1 minute
  redisRatelimitSearch = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
  });
}

// Fallback in-memory storage (Not effective against distributed attacks in Serverless)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

async function checkRateLimit(ip: string, type: 'auth' | 'search'): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Use Upstash Redis if configured
  if (type === 'auth' && redisRatelimitAuth) {
    const { success, reset } = await redisRatelimitAuth.limit(ip);
    return { allowed: success, retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000) };
  }
  if (type === 'search' && redisRatelimitSearch) {
    const { success, reset } = await redisRatelimitSearch.limit(ip);
    return { allowed: success, retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000) };
  }

  // Fallback memory rate limit
  const now = Date.now();
  const record = loginAttempts.get(ip + type);
  const maxAttempts = type === 'auth' ? RATE_LIMIT_MAX_ATTEMPTS : 30;
  
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip + type, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (record.count >= maxAttempts) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

function cleanupRateLimits() {
  const now = Date.now();
  Array.from(loginAttempts.entries()).forEach(([ip, record]) => {
    if (now > record.resetAt) loginAttempts.delete(ip);
  });
}

if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Normalización estricta para comparaciones
  const lowerPathname = pathname.toLowerCase();
  const cleanPathname = lowerPathname.endsWith('/') && lowerPathname.length > 1 
    ? lowerPathname.slice(0, -1) 
    : lowerPathname;

  // 1. Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';

  // 1a. Rate limiting (Autenticación - Estricto)
  if (cleanPathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (!rateLimit.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many login attempts.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) },
      });
    }
  }

  // 1b. Rate limiting (Búsqueda API - Mitigación DDoS)
  if (cleanPathname.startsWith('/api/search')) {
    const rateLimit = await checkRateLimit(ip, 'search'); // Reuse the same function but with a suffixed key
    // A production app should configure a higher limit or specific limit window for search,
    // but reusing the existing memory map prevents simple script floods.
    if (!rateLimit.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many search requests.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) },
      });
    }
  }

  // 2. Obtener sesión de forma segura
  const session = await auth();
  const user = session?.user;

  // 3. Lógica de Redirección para Usuarios Autenticados en /login
  if (cleanPathname === LOGIN_PATH) {
    if (user) {
      const redirectUrl = user.passwordMustChange 
        ? new URL(CHANGE_PASSWORD_PATH, request.url)
        : new URL(DASHBOARD_PATH, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 4. Protección de Rutas (Dashboard y API interna)
  const isApi = cleanPathname.startsWith('/api');
  const isPublicApi = cleanPathname.startsWith('/api/auth') || cleanPathname.startsWith('/api/cron');
  const isDashboard = cleanPathname.startsWith(DASHBOARD_PATH);

  // Si la ruta requiere protección
  if ((isDashboard || isApi) && !isPublicApi) {
    // Si NO está autenticado
    if (!user) {
      if (isApi) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const loginRedirect = new URL(LOGIN_PATH, request.url);
      loginRedirect.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginRedirect);
    }

    // Si requiere cambio de contraseña
    if (user.passwordMustChange) {
      const isChangingPassword = cleanPathname === CHANGE_PASSWORD_PATH || 
                                 cleanPathname === '/api/users/change-password';
      
      if (!isChangingPassword) {
        if (isApi) {
          return new NextResponse(JSON.stringify({ error: 'Password change required', code: 'PASSWORD_MUST_CHANGE' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};