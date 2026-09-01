# Guía de Seguridad — FIX-AI NEXT

> Normas adaptadas al código real. Si escribes código nuevo, aplica esto. Basado en: `src/auth*.ts`, `src/proxy.ts`, `src/tenant-prisma.ts`, `src/lib/security.test.ts`, `next.config.ts`.

## 1. Autenticación

- Usa **NextAuth v5** (Credentials + JWT). No introduzcas otro esquema de sesión.
- Toma la sesión con `auth()` (server). Nunca confíes en flags de autenticación del cliente.
- Cookes con `httpOnly`, `secure`, `sameSite: strict` (ya configurado). No los toques.

## 2. Autorización (RBAC)

- Valida permisos con los guard de `src/lib/auth-utils.ts` (`requirePermission`, `requireAdminOrManager`, `validateTenantAccess`, `requireTicketActionPermission`).
- **El frontend solo oculta UI; el servidor autoriza.** Toda Server Action/Route Handler DEBE re-verificar rol + tenant antes de mutar.
- Para usuarios: `canModifyUser(actor, target, role)`.

## 3. Tenant isolation

- Usa **`getTenantPrisma(tenantId, userId)`** para todo modelo tenanted.
- `prisma` crudo solo para: cron system-wide, auth por email, portal público por número de ticket.
- **No** uses `prisma` crudo en acciones CRUD tenanted.
- Ten cuidado con `findUnique` (se reescribe a `findFirst` escopetado) — no asumas semántica de unicidad por PK.

## 4. Validación de entrada

- **Zod en el servidor**: schemas centrales en `src/lib/schemas.ts`. Reutilízalos.
- Nunca valides **solo** en el cliente. El cliente es UX; el servidor es la verdad.
- En route handlers CRUD, no definas zod inline duplicado si existe el schema central.

## 5. SQL injection

- Prisma parametriza queries. **No** uses `$queryRawUnsafe` ni concatenes strings en SQL. Si necesitas raw, usa `$queryRaw` con placeholders.

## 6. XSS

- React escapa por defecto. **Evita `dangerouslySetInnerHTML`** salvo contenido 100% controlado (en `layout.tsx` hay un JSON-LD seguro).
- No introduzcas HTML con `dangerouslySetInnerHTML` desde datos de usuario/BD.

## 7. CSRF

- NextAuth/Server Actions manejan la protección de doble envío. No deshabilitarla.
- No expongas mutaciones por GET.

## 8. Rate limiting

- Se aplica en `src/proxy.ts` (por IP):
  - Auth/forgot-password: **10 / 1 min** (sliding window) en `/api/auth/callback/credentials` y `/forgot-password`.
  - Search + portal público: **30 / 1 min** en `/api/search`, `/tickets/status`, `/tickets/approval`.
  - Export: **15 / 1 min** en `/api/export`.
- Con `UPSTASH_REDIS_*` es distribuido; **sin ellas cae a memoria** (limitado en serverless).
- Si añades endpoints sensibles (imports, bulk), considera sumarlos aquí.

## 9. Secrets / variables de entorno

- Todo secreto en `.env.local` (gitignored). **Nunca** en el código ni en commits.
- `.env.example` guarda solo nombres/placeholders.
- No documentes ni loguees valores.
- `AUTH_SECRET`, `CRON_SECRET`, `SMTP_PASS`, `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_TOKEN` = secretos.

## 10. Logging

- El sistema de **AuditLog** registra acciones del tenant (`src/lib/audit-actions.ts`).
- **No** loguees contraseñas, tokens, ni datos personales completos.
- `console.error` válido para errores de producción; retira `console.log` de debug.

## 11. Exposición de errores

- No devuelvas detalles de BD (stack, mensajes de Prisma) al cliente.
- Mapea errores esperados a mensajes limpios; los inesperados se registran y se devuelve un mensaje genérico.
- Existe `src/lib/errors/` para errores tipados de dominio (NotFound, Validation, Authorization, BusinessRule).

## 12. File uploads

- Los adjuntos de tickets usan **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) en `/api/tickets/[id]/attachments`.
- No guardes archivos en el filesystem del servidor serverless. Valida tipos/tamaños. Escopeta por ticket/tenant.

## 13. Webhooks / cron

- Los endpoints `/api/cron/*` exigen el header/secret `CRON_SECRET`. No los dejes abiertos.

## 14. Cabeceras / headers

- `next.config.ts` ya configura headers de seguridad (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- **Deuda conocida**: **no hay CSP ni HSTS** configurados en `next.config.ts` (la doc vieja los reclama pero el código no los tiene). Si aplica hardening, añádelos ahí.

---

## Checklist rápido al añadir endpooint/acción

- [ ] Autentica (session del servidor)
- [ ] Autoriza por rol (`requirePermission`/guard)
- [ ] Verifica tenant (`getTenantPrisma`)
- [ ] Valida entrada (Zod server)
- [ ] Mapea errores (no expongas internos)
- [ ] Rate limit si es sensible
- [ ] Revalidate cache tras mutar
