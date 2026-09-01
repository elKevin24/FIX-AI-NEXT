# 🗺️ Roadmap de Seguridad, Hardening, Observabilidad y Resiliencia (v2.0)
## FIX-AI NEXT — Enterprise Production Readiness

Este documento define la **estrategia integral y cronograma técnico de seguridad, endurecimiento en producción, observabilidad y recuperación ante desastres** para FIX-AI NEXT.

---

## 📌 Resumen Ejecutivo de Fases

| Fase | Enfoque Principal | Prioridad | Estado |
| :--- | :--- | :---: | :---: |
| **Fase 0** | Remediación Crítica Inmediata & Fuga de Credenciales | 🔴 P0 (Crítico) | ✅ **Completado** |
| **Fase 1** | Hardening de Red, Headers Base & Rate Limiting | 🟠 P1 (Alto) | ✅ **Completado** |
| **Fase 2** | Aislamiento Multi-Tenant & RBAC en APIs | 🟠 P1 (Alto) | ✅ **Completado** |
| **Fase 3** | Recuperación de Contraseñas & Gestión de Sesiones | 🟡 P2 (Medio) | ✅ **Completado** |
| **Fase 4** | Subida de Archivos, Dependencias & CI/CD Base | 🟢 P3 (Mantenimiento) | ✅ **Completado** |
| **Fase 5** | Production Hardening, Headers Avanzados & Health Checks | 🔴 P1 (Crítico) | ✅ **Completado** |
| **Fase 6** | Observabilidad, APM & Logging Estructurado | 🟠 P2 (Alto) | ✅ **Completado** |
| **Fase 7** | Resiliencia de Base de Datos, Backups & Disaster Recovery | 🟡 P2 (Medio) | ✅ **Completado** |
| **Fase 8** | Operaciones, Runbooks & Respuesta a Incidentes | 🟢 P3 (Operativo) | ✅ **Completado** |

---

## ✅ Fases Completadas (Línea Base Consolidada)

### 🔴 Fase 0: Remediación Crítica Inmediata
- [x] **0.1 Desvincular `.env` de Git y rotar credenciales comprometidas**: Archivos `.env` desindexados del árbol Git y llaves regeneradas.
- [x] **0.2 Eliminar endpoint inseguro `/api/temp-users`**: Carpeta eliminada por completo.
- [x] **0.3 Implementar Proxy/Middleware Centralizado de NextAuth**: `src/proxy.ts` intercepta `/dashboard/*` y `/api/*` redirigiendo a `/login` a usuarios sin sesión activa.
- [x] **0.4 Estandarizar Variables de Entorno (`AUTH_SECRET`)**: Configurado para firma de JWTs con prefijo `__Host-` en cookies seguras.

### 🟠 Fase 1: Hardening de Red, Headers Base & Endpoints
- [x] **1.1 Proteger Endpoints CRON con Token Secreto**: Validación de `Authorization: Bearer <CRON_SECRET>` en `/api/cron/sla-check` y `/api/cron/quotations`.
- [x] **1.2 Configurar Headers de Seguridad HTTP Básicos**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`.
- [x] **1.3 Implementar Rate Limiting Distribuido**: Integración de `@upstash/ratelimit` en `src/proxy.ts` para rutas de autenticación, búsqueda y exportación.
- [x] **1.4 Sanitizar Respuestas de Error en APIs**: Captura de errores internos sin filtrar trazas SQL de Prisma en respuestas 500.

### 🟠 Fase 2: Aislamiento Multi-Tenant & RBAC en APIs
- [x] **2.1 Registrar Modelos en `TENANTED_MODELS`**: Set ampliado en `src/lib/tenant-prisma.ts` cubriendo `SessionLog`, `UserPresence`, `AuditLog`, `CreditNote`, etc.
- [x] **2.2 Restricción RBAC en Exportaciones de Datos**: Validación de rol `ADMIN` o `MANAGER` en `/api/export/[type]`.
- [x] **2.3 Bloqueo de Intentos Fallidos de Login**: Bloqueo físico en BD tras 5 intentos fallidos durante 15 minutos (`lockedUntil`).

### 🟡 Fase 3: Recuperación de Contraseñas & Gestión de Sesiones
- [x] **3.1 Modelo de Tokens de Restablecimiento en Prisma**: Tabla `PasswordResetToken` con tokens de un solo uso hasheados (SHA-256).
- [x] **3.2 Server Action y Envío de Correo (`forgot-password`)**: Generación de tokens seguros y envío vía `@react-email` / SMTP.
- [x] **3.3 Pantalla y Acción de Cambio de Contraseña (`reset-password`)**: Validación de expiración y actualización de hash `bcryptjs`.

### 🟢 Fase 4: Subida de Archivos, Dependencias & CI/CD Base
- [x] **4.1 Validación de Magic Numbers en Archivos Adjuntos**: Validación binaria de firmas de archivo (JPEG, PNG, WebP, PDF, DOCX) en `/api/tickets/[id]/attachments`.
- [x] **4.2 Remediación Completa de Vulnerabilidades (`npm audit`)**: 0 alertas críticas o altas en dependencias.
- [x] **4.3 Automatización de CI/CD**: Workflow con `tsc`, `lint`, `vitest` (532 pruebas) y escaneo de secretos con TruffleHog.

### 🔴 Fase 5: Production Hardening, Headers Avanzados & Health Checks
- [x] **5.1 CSP, HSTS, COOP & CORP en `next.config.ts`**: Cabeceras configuradas incluyendo `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` y `Content-Security-Policy`.
- [x] **5.2 Endpoint de Salud y Readiness `/api/health`**: Sonda activa con timeout para PostgreSQL (`SELECT 1;`) y Upstash Redis.
- [x] **5.3 Sanitización contra Inyección de Fórmulas CSV & Límites de Memoria**: Paginación acotada a `take: 5000` y prefijado de apóstrofe en campos con `=`, `+`, `-`, `@` en `/api/export/[type]`.
- [x] **5.4 Saneamiento de `.env.example` y Variables Obsoletas**: Documentación de `UPSTASH_*` y `BLOB_*`, eliminación de variables legacy `STACK_*`.
- [x] **5.5 Comparación Criptográfica Timing-Safe en Endpoints CRON**: Validación de cabeceras en `/api/cron/*` usando `crypto.timingSafeEqual`.

### 🟠 Fase 6: Observabilidad, APM & Logging Estructurado
- [x] **6.1 Logger Estructurado Centralizado (`src/lib/logger.ts`)**: Logger JSON con soporte de niveles `DEBUG`, `INFO`, `WARN`, `ERROR`, `AUDIT` y redacción automática de secretos.
- [x] **6.2 Limpieza de Logs Crudos en Autenticación**: Eliminados logs en texto plano en el flujo de `authorize` de `src/auth.ts`.
- [x] **6.3 Propagación de Request ID / Correlation ID**: Inyección del header `x-request-id` en `src/proxy.ts` hacia requests y responses.

### 🟡 Fase 7: Resiliencia de Base de Datos, Backups & Disaster Recovery
- [x] **7.1 Procedimiento Formal de Point-in-Time Recovery (PITR)**: Documentado en `docs/operations/disaster-recovery.md` con objetivos RPO < 5m y RTO < 15m.
- [x] **7.2 Eliminación de `$executeRawUnsafe` en Mantenimiento de Logs**: Reemplazado por tagged template seguro `$executeRaw` en `src/lib/audit-actions.ts`.

### 🟢 Fase 8: Operaciones, Runbooks & Respuesta a Incidentes
- [x] **8.1 Manual de Respuesta a Incidentes**: Publicado en `docs/operations/incident-response.md`.
- [x] **8.2 Catálogo de Runbooks Operacionales**: Creados `db-outage.md`, `secret-leak.md`, `tenant-breach.md`, `deployment-rollback.md` en `docs/operations/runbooks/`.
- [x] **8.3 Inclusión de la Rama `develop` en CI Triggers**: Workflows `.github/workflows/ci.yml` y `security.yml` actualizados.
