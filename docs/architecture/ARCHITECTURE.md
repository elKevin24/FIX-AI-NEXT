# Arquitectura — FIX-AI NEXT

> Documento actualizado contra el **código real** (branch `develop`). Si algo de este doc contradice el código, **el código manda**.

## Visión general

Aplicación web **multi-tenant** (shared database + shared schema) para la gestión de talleres de reparación electrónica. Cada *tenant* (taller) es un registro de la tabla `tenants`; todos los modelos de datos de un tenant llevan una columna escalar `tenantId` y se aíslan **en la capa de acceso a datos** mediante `getTenantPrisma`.

### Diagrama de flujo (real)

```
Browser
   ↓
Next.js 16 (App Router)
   ↓
Middleware (src/proxy.ts)  → auth + rate limiting + passwordMustChange
   ↓
Server Components  +  Client Components  +  Route Handlers (src/app/api)
   ↓
Server Actions ('use server')  →  src/lib/actions/*, src/lib/*-actions.ts
   ↓
Business Logic (use-cases siempre que existan; si no, directo en la action)
   ↓
getTenantPrisma(tenantId, userId)   (src/lib/tenant-prisma.ts)
   ↓
Prisma 7 + @prisma/adapter-neon
   ↓
PostgreSQL / Neon
```

## Stack real (verificado)

- **Next.js 16.3.3** / **React 19.2.1** / **TypeScript 5** (strict).
- **Prisma 7** + `@prisma/adapter-neon` — el adapter se pasa programáticamente en `src/lib/prisma.ts` (no hay `url`/`directUrl` en `prisma/schema.prisma`).
- **PostgreSQL** vía **Neon** (producción) o Docker (local).
- **NextAuth v5** (Credentials + JWT).
- **Zod**, **date-fns**, **nuqs**, **Recharts**, **xlsx**, **jspdf/html2canvas**, **@react-email+Nodemailer**, **qrcode**, **Serwist** (PWA).
- **Testing**: Vitest + Testing Library + Playwright.

> No usarás **Zustand** ni **@tanstack/react-query**: no están instalados. El estado/fecthing es server-driven (Server + Server Actions). `nuqs` se usa únicamente en filtros de listados (`PartSearchFilters`, `TicketSearchFilters`) para mantener el estado en la URL.

## Frontend

- **Rota principal dividida**: área pública de auth (`/login`, `/forgot-password`, `/reset-password`), portal público (`/tickets/status/[id]`, `/tickets/approval`), y el área autenticada `/dashboard/*`.
- **Layout root** (`src/app/layout.tsx`): `ThemeProvider` (con `ThemeInit`), `NuqsAdapter`, `SerwistProvider` (PWA), `SpeedInsights` + `Analytics` (Vercel), skip-link y metadata SEO/OG.
- **CSS Modules** por componente + **design tokens** en `src/app/globals.css` (light/dark/dark-colorblind).
- **`'use client'`** solo donde hay interactividad/estado (ver `docs/development/rules.md`).

## Backend

- **Server Actions** son el mecanismo primario de mutación. Están en `src/lib/actions/*-actions.ts` y `src/lib/*-actions.ts` (`'use server'`).
  - Los módulos `customer`/`part`/`ticket` delegan en **Use Cases** (`src/use-cases/`).
  - `user` y `tenant-settings` consultan `getTenantPrisma` **directamente en la action**.
  - Hay una capa de repositorios (`src/lib/repositories/`) que hoy **no consume** la mayoría de las actions (plumbing paralelo).
- **Route Handlers** (`src/app/api/**/route.ts`) cubren: auth (NextAuth), cron (`/api/cron/*`, protegidos con `CRON_SECRET`), export (`/api/export/*`), attachments, pool de tickets, disponibilidad de técnicos y CRUD legacy (`/api/users`, `/api/customers`, `/api/tickets`). El frontend usa **Server Actions** para los flujos nuevos; las rutas CRUD son en buena medida herencia.
- **Middleware** = `src/proxy.ts` (Next 16 renombró `middleware.ts`): protege `/dashboard` y `/api` internos, fuerza `passwordMustChange`, y aplica rate limiting por IP (Upstash Redis con fallback en memoria).

## Datos / Multi-tenancy

- Modelo tenancy: cada modelo tenanted tiene `tenantId` + relación `tenant`. No hay RLS por defecto (la migración `postgres_rls_policies` existe como hardening).
- El aislamiento de datos lo impone **`getTenantPrisma(tenantId, userId)`**, que:
  - inyecta `tenantId` en `where` de `findMany/findFirst/findUnique/count/aggregate/groupBy/update/delete` para los modelos de `TENANTED_MODELS`;
  - añade `tenantId` y `createdById/updatedById` en `create/createMany`;
  - en `update/delete` verifica que el registro pertenezca al tenant, lanzando `P2025` si no.
- **`findUnique` se reimplementa como `findFirst` escopetado** (para poder inyectar tenantId).
- Puntos donde se usa `prisma` (no tenanted) a propósito: cron system-wide (`/api/cron/*`, `quotation-cron`), `sla-actions`, `auth-actions` (password reset por email), y `ticket.repository.ts` (búsqueda pública del portal).

## Capas de dependencia (regla)

Permitido (derecha usa abajo):

```
UI (components)      → solo props + Server Actions + ui primitives
Feature (pages)      → Server Actions / Use Cases
Business Logic       → Use Cases (getTenantPrisma / repos)
Data Access          → Prisma via getTenantPrisma
Database             → Neon / Postgres
```

Prohibido / a evitar:
- **UI → Prisma directo** (las páginas no consultan Prisma; siempre vía action/use-case).
- **UI → `getTenantPrisma` directo dentro de un `'use client'`** (hace falta `server-only`).
- Saltarse `getTenantPrisma` para modelos tenanted (riesgo de fuga cross-tenant).

## Decisiones arquitectónicas pendientes de consolidar

- La capa `repositories/` + `container.ts` es en gran parte **plumbing paralelo no consumido**; decidir si se adopta o se elimina.
- Hay server actions dispersas (5 en `actions/`, ~15 en raíz de `lib/`); conviene unificar ubicación.

Ver ADRs recomendados en `docs/adr/` (propuesto) para las decisiones `por qué`.
