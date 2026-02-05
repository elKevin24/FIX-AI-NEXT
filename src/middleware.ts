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

// --- CONFIGURATION ---
const PUBLIC_ROUTES = new Set(['/login', '/auth/error', '/auth/verify-request']);
const PUBLIC_API_PREFIXES = ['/api/auth'];
const DASHBOARD_PREFIX = '/dashboard';
const API_PREFIX = '/api';

// Rate limiting storage
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Normalize and check for public routes first
  const normalizedPathname = pathname.toLowerCase().replace(/\/$/, "") || "/";
  
  // Rate limiting for login attempts
  if (normalizedPathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many login attempts.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) },
      });
    }
  }

  // 2. Auth Session
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // 3. Handle Login Page (Redirect if already authenticated)
  if (normalizedPathname === '/login') {
    if (isAuthenticated) {
      const target = session.user.passwordMustChange 
        ? '/dashboard/profile/change-password' 
        : '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 4. Determine if route is protected
  const isPublicApi = PUBLIC_API_PREFIXES.some(prefix => normalizedPathname.startsWith(prefix));
  const isDashboardRoute = normalizedPathname.startsWith(DASHBOARD_PREFIX);
  const isApiRoute = normalizedPathname.startsWith(API_PREFIX);
  const isProtected = (isDashboardRoute || isApiRoute) && !isPublicApi;

  if (isProtected) {
    // GUARD: Redirect or error if not authenticated
    if (!isAuthenticated) {
      if (isApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // GUARD: Force password change if required
    if (session.user.passwordMustChange) {
      const changePasswordPath = '/dashboard/profile/change-password';
      const isChangePasswordAction = normalizedPathname === '/api/users/change-password' || 
                                    normalizedPathname === changePasswordPath;

      if (!isChangePasswordAction) {
        if (isApiRoute) {
          return new NextResponse(JSON.stringify({ error: 'Password change required', code: 'PASSWORD_MUST_CHANGE' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return NextResponse.redirect(new URL(changePasswordPath, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
