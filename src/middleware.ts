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
import { updateSessionActivity } from '@/lib/audit-actions';

// Rate limiting storage (in-memory, resets on deploy)
// For production, use Redis or similar
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 10; // Max attempts per minute per IP

/**
 * Check rate limit for login attempts
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Clean up old rate limit records periodically
 */
function cleanupRateLimits() {
  const now = Date.now();
  loginAttempts.forEach((record, ip) => {
    if (now > record.resetAt) {
      loginAttempts.delete(ip);
    }
  });
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for login API
  if (pathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      );
    }
  }

  // Authentication check for protected routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    // Skip auth check for public API routes
    const publicApiRoutes = ['/api/auth'];
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    const session = await auth();

    // Update session log activity
    if (session?.user) {
      // Note: This is an async call but we don't necessarily need to await it to block the request
      updateSessionActivity();
    }

    // Redirect to login if not authenticated
    if (!session?.user) {
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Force password change redirect
    if (session.user.passwordMustChange) {
      const changePasswordPath = '/dashboard/profile/change-password';

      // Don't redirect if already on change password page or logging out
      if (pathname !== changePasswordPath &&
          !pathname.startsWith('/api/auth') &&
          pathname !== '/api/users/change-password') {

        // For API routes, return error
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({
              error: 'Password change required',
              code: 'PASSWORD_MUST_CHANGE',
              redirectTo: changePasswordPath,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Redirect to password change page
        return NextResponse.redirect(new URL(changePasswordPath, request.url));
      }
    }
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login') {
    const session = await auth();
    if (session?.user) {
      // If password must change, redirect to change password
      if (session.user.passwordMustChange) {
        return NextResponse.redirect(
          new URL('/dashboard/profile/change-password', request.url)
        );
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
