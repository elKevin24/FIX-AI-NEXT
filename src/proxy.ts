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
const DASHBOARD_PATH = '/dashboard';
const LOGIN_PATH = '/login';
const CHANGE_PASSWORD_PATH = '/dashboard/profile/change-password';

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

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // Normalización estricta para comparaciones
  const lowerPathname = pathname.toLowerCase();
  const cleanPathname = lowerPathname.endsWith('/') && lowerPathname.length > 1 
    ? lowerPathname.slice(0, -1) 
    : lowerPathname;

  // 1. Rate limiting (Solo para el endpoint de autenticación)
  if (cleanPathname === '/api/auth/callback/credentials' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new NextResponse(JSON.stringify({ error: 'Too many login attempts.' }), {
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
  const isPublicApi = cleanPathname.startsWith('/api/auth');
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