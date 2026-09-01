# Autenticación — FIX-AI NEXT

> Basado en el código real: `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/lib/actions/auth-actions.ts`.

## Mecanismo

- **NextAuth v5** con proveedor **Credentials** (email + contraseña).
- **Estrategia JWT** (sin sesiones en BD). El JWT se firma con `AUTH_SECRET`.
- El flujo completo:

```
GET /login
   ↓  formulario
POST /api/auth/callback/credentials   (proxy: rate limit 10/1min por IP)
   ↓  authorize() en src/auth.ts
      - valida email/password (zod)
      - busca usuario activo por email
      - verifica isActive, lockout (lockedUntil) y cuenta bloqueada
      - bcryptjs.compare(password)
      - registra fallo/éxito + intentos (bloqueo tras 5 intentos / 15 min)
   ↓  éxito → JWT { id, email, name, role, tenantId, passwordMustChange }
   ↓  session callbacks → session.user { id, role, tenantId, passwordMustChange }
   ↓  middleware (src/proxy.ts) aplica autorización de ruta
   ↓  aplicación
```

## Datos de sesión disponibles

En `session.user`:
- `id` (string) — id de usuario (del `token.sub`).
- `role` (`ADMIN | MANAGER | TECHNICIAN | VIEWER` en el tipo de `next-auth.d.ts`).
- `tenantId` (string) — **contexto de tenant**. Fuente para `getTenantPrisma`.
- `passwordMustChange` (boolean) — fuerza redirección a `/dashboard/profile/change-password`.

> `SUPER_ADMIN` es un rol singleton/gestionado externamente (ver `src/lib/authz.ts` y `SUPERADMIN_EMAILS`). No se crea vía el flujo normal de usuarios.

## Seguridad de cookies

(`src/auth.config.ts`)
- `httpOnly: true`, `sameSite: 'strict'`, `secure: true` en producción.
- En producción el cookie usa prefijo `__Host-`.
- `useSecureCookies = NODE_ENV === 'production'`.

## Middleware / protección de rutas (`src/proxy.ts`)

- `/dashboard` e internos `/api/*` **requieren sesión**; si no hay, `401` (API) o redirect a `/login?callbackUrl=` (páginas).
- `/api/auth` y `/api/cron` son públicos por diseño.
- Si `passwordMustChange` y la ruta no es la de cambio de contraseña → `403` con código `PASSWORD_MUST_CHANGE` (API) o redirect (páginas).
- `/login` redirige a `/dashboard` (o a cambio de contraseña) si ya hay sesión.

## Recuperación de contraseña

- `/forgot-password` → `requestPasswordReset` (proxy rate limit) → genera token y envía email con enlace de restablecimiento.
- `/reset-password` → `resetPassword` (valida token + conformidad de política en `src/lib/password-utils.ts`).
- Cambio de contraseña post-login → `changePassword` (Server Action).
- Los tokens de reset viven en la tabla `PasswordResetToken` (no tenanted; escopetados por email/token).

## Consideraciones de seguridad al escribir código

- **Nunca** leer/confiar en el rol o tenantId provenientes del cliente; tomar siempre de `session.user`.
- Para trabajar con datos por tenant, pasar `session.user.tenantId` a `getTenantPrisma`.
- Validar entradas en el **servidor** (Zod) antes de mutar; el cliente solo es UX.
- El estado de autenticación se obtiene con `auth()` (server) — ver `src/lib/auth-context.ts` para helpers (`requireTenantSession`, `assertNotViewer`, `assertAdmin`).
