# 🗺️ Roadmap de Seguridad, Backend, API y Base de Datos (FIX-AI-NEXT)

Este roadmap organiza las remediaciones de la auditoría en **5 fases ordenadas por criticidad e impacto**. Cada tarea incluye los archivos afectados, la solución técnica requerida y el criterio de aceptación.

---

## 📌 Resumen de Fases

| Fase | Enfoque | Prioridad | Estado |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Remediación Crítica Inmediata & Fuga de Credenciales | 🔴 P0 (Crítico) | ⏳ Pendiente |
| **Fase 1** | Hardening de Red, Headers & Protección de Endpoints | 🟠 P1 (Alto) | ⏳ Pendiente |
| **Fase 2** | Aislamiento Multi-Tenant & RBAC en APIs | 🟠 P1 (Alto) | ⏳ Pendiente |
| **Fase 3** | Recuperación de Contraseñas & Gestión de Sesiones | 🟡 P2 (Medio) | ⏳ Pendiente |
| **Fase 4** | Subida de Archivos, Dependencias & Auditoría CI/CD | 🟢 P3 (Mantenimiento) | ⏳ Pendiente |

---

## 🔴 Fase 0: Remediación Crítica Inmediata (P0)
> **Objetivo:** Detener la exposición de credenciales y cerrar accesos no autorizados directos al backend.

- [x] **0.1 Desvincular `.env` de Git y rotar credenciales comprometidas**
  - **Archivos:** `.env`, `.gitignore`
  - **Acción:**
    1. Ejecutar `git rm --cached .env`.
    2. Confirmar commit y push para que `.env` deje de estar en el árbol de Git.
    3. **Rotación obligatoria:**
       - Regenerar contraseña de usuario `neondb_owner` en Neon Console.
       - Rotar API Key de Resend (`RESEND_API_KEY`).
       - Rotar Server Secret de Stack Auth (`STACK_SECRET_SERVER_KEY`).
  - **Criterio de Aceptación:** `git ls-files .env` devuelve vacío y las credenciales antiguas son revocadas.

- [x] **0.2 Eliminar endpoint inseguro `/api/temp-users`**
  - **Archivos:** `src/app/api/temp-users/route.ts`
  - **Acción:** Eliminar completamente la carpeta `src/app/api/temp-users`.
  - **Criterio de Aceptación:** Cualquier petición a `/api/temp-users` retorna `404 Not Found`.

- [x] **0.3 Implementar Middleware Centralizado de NextAuth**
  - **Archivos:** `src/middleware.ts`, `src/auth.config.ts`
  - **Acción:**
    1. Crear `src/middleware.ts` exportando `auth` desde `@/auth` o utilizando `authConfig` para interceptar de manera global todas las rutas bajo `/dashboard/:path*` y `/api/:path*` (exceptuando `/api/auth/*` y assets públicos).
    2. Redirigir automáticamente a `/login` a usuarios sin sesión activa antes de que cualquier Server Component o layout sea evaluado.
  - **Criterio de Aceptación:** Intentar ingresar a `/dashboard` o subrutas sin cookie de sesión redirige a `/login` de forma transparente a nivel middleware.

- [x] **0.4 Estandarizar Variables de Entorno (`AUTH_SECRET`)**
  - **Archivos:** `.env.example`, `src/auth.ts`
  - **Acción:** Añadir `AUTH_SECRET` generado con `npx auth secret` en `.env.example` y asegurar su presencia en producción para la firma de JWTs.
  - **Criterio de Aceptación:** La aplicación no emite advertencias de `AUTH_SECRET` faltante durante el build.

---

## 🟠 Fase 1: Hardening de Red, Headers & Endpoints (P1)
> **Objetivo:** Proteger el servidor contra ataques de denegación, abusos automatizados y manipulación de cabeceras.

- [x] **1.1 Proteger Endpoints CRON con Token Secreto**
  - **Archivos:**
    - `src/app/api/cron/quotations/route.ts`
    - `src/app/api/cron/sla-check/route.ts`
  - **Acción:**
    - Validar que el header `Authorization: Bearer <CRON_SECRET>` coincida con `process.env.CRON_SECRET`.
    - Retornar `401 Unauthorized` si el token es inválido o no está presente.
  - **Criterio de Aceptación:** Peticiones GET manuales sin el Bearer token correcto son rechazadas inmediatamente.

- [x] **1.2 Configurar Headers de Seguridad HTTP**
  - **Archivos:** `next.config.ts`
  - **Acción:** Configurar la propiedad `headers()` en NextConfig con:
    - `X-Frame-Options: DENY` (Anti Clickjacking).
    - `X-Content-Type-Options: nosniff` (Anti MIME sniffing).
    - `Referrer-Policy: strict-origin-when-cross-origin`.
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS).
    - Content-Security-Policy (CSP) base.
  - **Criterio de Aceptación:** Los headers aparecen en la respuesta de cualquier ruta inspeccionada en DevTools o `curl -I`.

- [x] **1.3 Implementar Rate Limiting en Rutas Críticas**
  - **Archivos:** `src/middleware.ts` o utilidad `src/lib/rate-limit.ts`
  - **Acción:**
    - Limitar peticiones a `/api/auth/*` y `/api/search` (ej. máx 10 peticiones/minuto por IP).
    - Retornar `429 Too Many Requests` con header `Retry-After`.
  - **Criterio de Aceptación:** Ráfagas de peticiones concurrentes son frenadas con código 429.

- [x] **1.4 Sanitizar Respuestas de Error en APIs**
  - **Archivos:** Rutas en `src/app/api/**/route.ts`
  - **Acción:** Reemplazar `error: error.message` o `error: String(error)` en bloques `catch` por mensajes de error genéricos y amigables para el cliente, registrando el error real únicamente en el servidor vía `console.error`.
  - **Criterio de Aceptación:** No se filtran trazas de Prisma ni detalles de infraestructura en el cuerpo JSON de respuestas 500.

---

## 🟠 Fase 2: Aislamiento Multi-Tenant & RBAC en APIs (P1/P2)
> **Objetivo:** Garantizar que ninguna entidad quede fuera del filtro de tenant y reforzar permisos por rol.

- [x] **2.1 Registrar Modelos Faltantes en `TENANTED_MODELS`**
  - **Archivos:** `src/lib/tenant-prisma.ts`
  - **Acción:**
    - Agregar `'SessionLog'` y `'UserPresence'` al `Set` de `TENANTED_MODELS`.
    - Verificar si nuevos modelos creados en `schema.prisma` requieren inclusión automática.
  - **Criterio de Aceptación:** Consultas directas sobre `SessionLog` y `UserPresence` mediante `getTenantPrisma` inyectan automáticamente `where: { tenantId }`.

- [x] **2.2 Restricción RBAC en Exportaciones de Datos**
  - **Archivos:** `src/app/api/export/[type]/route.ts`
  - **Acción:**
    - Verificar que el usuario tenga rol `ADMIN` o `MANAGER` antes de permitir la descarga masiva de facturas, clientes, repuestos y tickets.
    - Retornar `403 Forbidden` para roles no autorizados (`VIEWER`, `TECHNICIAN`).
  - **Criterio de Aceptación:** Usuarios técnicos o visores no pueden descargar volcados completos de inventario o finanzas.

- [x] **2.3 Resolver Ambigüedad de Login Multi-Tenant**
  - **Archivos:** `src/auth.ts`, `src/app/login/page.tsx`
  - **Acción:**
    - Documentar o definir la estrategia de autenticación:
      - *Opción A:* El correo electrónico debe ser globalmente único en toda la plataforma.
      - *Opción B:* El formulario de login solicita `tenantSlug` / identificador del taller si existen cuentas duplicadas.
  - **Criterio de Aceptación:** No ocurren colisiones ni bloqueos cruzados entre usuarios con el mismo email en diferentes talleres.

---

## 🟡 Fase 3: Recuperación de Contraseñas & Gestión de Sesiones (P2)
> **Objetivo:** Brindar a los usuarios un flujo seguro y autónomo para restablecer credenciales.

- [ ] **3.1 Modelo de Tokens de Restablecimiento en Prisma**
  - **Archivos:** `prisma/schema.prisma`
  - **Acción:**
    - Crear modelo `PasswordResetToken` con campos: `id`, `email`, `tokenHash` (hasheado con SHA-256), `expiresAt`, `createdAt`.
    - Generar migración con `npm run db:migrate`.
  - **Criterio de Aceptación:** La tabla almacena únicamente el hash del token y su tiempo de vida (máx 15-30 minutos).

- [ ] **3.2 Server Action y Envío de Correo (`forgot-password`)**
  - **Archivos:**
    - `src/lib/actions/auth-actions.ts`
    - `src/emails/ResetPasswordEmail.tsx`
    - `src/app/forgot-password/page.tsx`
  - **Acción:**
    - Crear página `/forgot-password`.
    - Generar token criptográfico seguro con `crypto.randomBytes()`.
    - Enviar email con enlace único de un solo uso `/reset-password?token=...`.
    - Responder con mensaje genérico ("Si el correo existe, recibirás un enlace") para evitar enumeración de correos.
  - **Criterio de Aceptación:** Se recibe el correo con el enlace de restablecimiento.

- [ ] **3.3 Pantalla y Acción de Cambio de Contraseña (`reset-password`)**
  - **Archivos:**
    - `src/app/reset-password/page.tsx`
    - `src/lib/actions/auth-actions.ts`
  - **Acción:**
    - Validar token y expiración en la base de datos.
    - Aplicar `PASSWORD_POLICY` (mínimo 8 caracteres, mayúscula, minúscula, número, símbolo).
    - Hashear nueva contraseña con `bcryptjs`, actualizar usuario y eliminar el token usado.
  - **Criterio de Aceptación:** La contraseña se actualiza exitosamente y el token no puede ser reutilizado.

---

## 🟢 Fase 4: Subida de Archivos, Dependencias & CI/CD (P3)
> **Objetivo:** Fortalecer la integridad de archivos adjuntos y mantener el proyecto libre de dependencias vulnerables.

- [x] **4.1 Validación Robusta de Archivos Adjuntos**
  - **Archivos:** `src/app/api/tickets/[id]/attachments/route.ts`
  - **Acción:**
    - Validar extensión de archivo permitida (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`, `.docx`, `.txt`).
    - Desinfectar nombres de archivo (`originalName`) eliminando caracteres especiales o secuencias como `..` o `/`.
    - (Opcional) Inspeccionar magic bytes de cabecera de archivo para verificar el tipo real antes de subirlo a Vercel Blob.
  - **Criterio de Aceptación:** Archivos con extensiones ejecutables (`.exe`, `.sh`, `.html`, `.svg` con scripts) son rechazados.

- [ ] **4.2 Actualización y Remediación de Dependencias (`npm audit`)**
  - **Archivos:** `package.json`
  - **Acción:**
    - Actualizar paquetes reportados con vulnerabilidades (`nanoid`, `deepmerge-ts`, `@vercel/*`).
    - Ajustar overrides en `package.json` si es necesario.
  - **Criterio de Aceptación:** `npm audit` finaliza con 0 vulnerabilidades altas o críticas.

- [ ] **4.3 Automatización de Seguridad en CI/CD**
  - **Archivos:** `.github/workflows/ci.yml` (o pipeline existente)
  - **Acción:**
    - Incluir paso obligatorio `npm run check:all` (`tsc --noEmit && eslint . && vitest run && next build`).
    - Añadir paso de auditoría `npm audit --audit-level=high`.
  - **Criterio de Aceptación:** Ningún Pull Request con errores de tipo, linter o vulnerabilidades altas puede fusionarse.

