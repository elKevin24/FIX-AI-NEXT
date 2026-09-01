# FIX-AI NEXT — Sistema de Gestión Multi-Tenant para Talleres Electrónicos

> Documentación basada en el **código real** (branch `develop`). El código manda sobre cualquier documento.

Sistema integral para la gestión de talleres de reparación electrónica: tickets de servicio, inventario, punto de venta (POS), facturación, clientes, reportes y notificaciones. Diseñado como una plataforma **multi-tenant** (cada taller es un *tenant* con aislamiento total de datos).

---

## ¿Qué problema resuelve?

Centralizar las operaciones de uno o varios talleres en una sola plataforma segura y escalable, donde **cada taller solo ve sus propios datos**. Los registros por operador y la auditoría garantizan trazabilidad de cambio.

- **Aislamiento por tenant**: cada taller gestiona sus clientes, tickets, usuarios, inventario y ventas sin interferencias.
- **Flujo de tickets**: recepción → diagnóstico → reparación → entrega, con estados y prioridades.
- **Roles y permisos (RBAC)**: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `TECHNICIAN`, `VIEWER`.
- **POS + facturación**: ventas, cotizaciones, notas de crédito y caja.
- **Notificaciones por email**: cambios de estado, SLA, y **aprobación de presupuestos por enlace de un solo uso**.
- **Portal de autoservicio del cliente**: consulta de estado y aprobación/rechazo de presupuesto sin login.

---

## Cómo está construido

| Capa | Tecnología |
|------|-----------|
| Runtime / Rendering | **Next.js 16.3** + **React 19.2**, App Router, React Server Components |
| Lenguaje | **TypeScript 5** (strict) |
| ORM | **Prisma 7** + **@prisma/adapter-neon** (PostgreSQL) |
| Base de datos | **PostgreSQL** en **Neon** (serverless); local vía Docker |
| Autenticación | **NextAuth v5** (Credentials, JWT) |
| Validación | **Zod** |
| Estilos | **CSS Modules** + sistema de **design tokens** (light/dark/colorblind) |
| Tablas | **TanStack React Table** (headless) |
| Gráficos | **Recharts** |
| Documentos | **@react-pdf/renderer**, **jspdf** + **html2canvas**, **xlsx** (Excel/CSV), **qrcode** |
| Email | **@react-email** + **Nodemailer** (SMTP) |
| PWA / Service Worker | **Serwist** (Turbopack) |
| Estado URL | **nuqs** (filtros de búsqueda en la URL) |
| Rate limiting | **@upstash/ratelimit** + **@upstash/redis** (con fallback en memoria) |
| Testing | **Vitest** + **Testing Library** + **Playwright** |
| Observabilidad | **@vercel/analytics** + **@vercel/speed-insights** |
| Almacenamiento | **@vercel/blob** (adjuntos) |

### Stack declarado pero NO implementado (no lo busques en el código)

- **Zustand** — **no está** en `package.json`, **0 usos**. El estado se maneja con React Context + `useState` local + Server Actions.
- **@tanstack/react-query** — **no está** en `package.json`, **0 usos**. El fetching es server-driven (Server Components / Server Actions / Route Handlers).
- **Stack Auth** — scaffold temprano reemplazado por **NextAuth v5**. Las variables `NEXT_PUBLIC_STACK_*` de `.env.example` son **restos sin uso**.

---

## Estructura de la aplicación (alto nivel)

```
src/
├── app/               # App Router: páginas, layouts y route handlers (src/app/api/)
│   ├── (auth)         # login, forgot-password, reset-password
│   ├── dashboard/     # área autenticada (tickets, POS, inventory, reports…)
│   └── tickets/       # portal público: /tickets/status, /tickets/approval
├── components/
│   ├── ui/            # Design System (Button, Card, Modal, DataTable, Badge…)
│   ├── dashboard/     # Sidebar, TopNav, StatCard, widgets
│   ├── tickets/       # componentes específicos del flujo de tickets
│   ├── technicians/   # workload y disponibilidad
│   ├── pdf/           # PDFs (invoice, work order, delivery receipt)
│   └── presence/      # indicador/lista de usuarios online (no montado)
├── lib/
│   ├── actions/       # Server Actions modulares (user, ticket, part, customer, auth)
│   ├── *-actions.ts   # Server Actions de dominio (pos, invoice, cash-register…)
│   ├── prisma.ts      # PrismaClient + adapter Neon
│   ├── tenant-prisma.ts  # getTenantPrisma → aislamiento automático por tenant
│   ├── auth.ts / auth.config.ts / authz.ts / auth-utils.ts  # auth + RBAC
│   ├── schemas.ts     # schemas Zod centrales
│   └── events/ email-service.ts ticket-notifications.ts
├── hooks/             # useMediaQuery (usado por DataTable) + otros
├── contexts/          # Theme, Toast, Sidebar
├── use-cases/         # lógica de negocio (tickets, invoices, cash-register…)
├── emails/            # plantillas de email (@react-email)
└── types/             # next-auth.d.ts, ticket80mm.ts
```

Flujo típico de una operación:

```
Server Component / Client Component
        ↓  (llama)
Server Action ('use server')
        ↓
session.user.tenantId  (auth)
        ↓
getTenantPrisma(tenantId, userId)  → query con tenantId auto-inyectado
        ↓
PostgreSQL (Neon) → resultado → revalidatePath
```

---

## Cómo ejecutar el proyecto

Requisitos: **Node.js 20+** (usa `npm`), Docker (para Postgres local) u opcionalmente una base Neon remota.

### 1. Instalar dependencias

```bash
npm install          # ejecuta postinstall → prisma generate
```

### 2. Configurar variables de entorno

Copia `.env.example` → `.env.local` y completa los valores. Variables mínimas:

| Variable | ¿Requerida? | Propósito |
|----------|-------------|-----------|
| `DATABASE_URL` | **Sí** | Conexión a PostgreSQL (pooled para Neon). Se lee en `src/lib/prisma.ts`. |
| `AUTH_SECRET` | **Sí** | Firma del JWT de NextAuth (`npx auth secret`). |
| `NEXT_PUBLIC_APP_URL` | Sí (prod) | URL pública del sitio (emails, sitemap, robots). |
| `EMAIL_PROVIDER` / `SMTP_*` / `EMAIL_FROM` | Dep. de features | Envío de emails (proveedor `log` para desarrollo). |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Opcional | Rate limiting distribuido; sin ellas cae a un limitador en memoria. |
| `BLOB_READ_WRITE_TOKEN` | Sí (adjuntos) | Token de Vercel Blob. |
| `CRON_SECRET` | Sí (cron) | Protege los endpoints `POST /api/cron/*`. |
| `SUPERADMIN_EMAILS` | Opcional | Emails tratados como super admin global. |

> ⚠️ `DIRECT_DATABASE_URL` y `NEXT_PUBLIC_STACK_*` en `.env.example` son **restos sin uso en el código**. No son necesarias.

### 3. Base de datos

**Opcional A — Postgres local con Docker:**

```bash
npm run db:start
npm run db:migrate
npm run db:seed
```

**Opcional B — Neon (usado en producción):**

```bash
# configura DATABASE_URL con tu cadena de conexión pooled de Neon y luego:
npm run neon:migrate
npm run neon:seed
```

### 4. Ejecutar en desarrollo

```bash
npm run dev          # http://localhost:3000
```

### 5. Lint, tipos, tests y build

```bash
npm run lint          # eslint .
npx tsc --noEmit      # chequeo de tipos
npm test              # vitest run
npm run build         # next build (producción)
```

### Credenciales demo (del seed)

Tenant `electrofix`:

| Email | Rol |
|-------|-----|
| `admin@electrofix.com` | ADMIN |
| `manager@electrofix.com` | MANAGER |
| `miguel@electrofix.com` | TECHNICIAN |
| `lucia@electrofix.com` | TECHNICIAN |
| `recepcion@electrofix.com` | VIEWER |

---

## ¿Dónde está la lógica importante?

- **Autenticación**: `src/auth.ts` (NextAuth + JWT), `src/auth.config.ts`, `src/authz.ts` (`isSuperAdmin`).
- **RBAC (permisos por rol)**: `src/lib/auth-utils.ts` (`ROLE_PERMISSIONS`, `requirePermission`, `requireAdminOrManager`, `validateTenantAccess`…).
- **Multi-tenancy**: `src/lib/tenant-prisma.ts` (`getTenantPrisma` inyecta `tenantId` automáticamente).
- **Base de datos / schema**: `prisma/schema.prisma`; migraciones en `prisma/migrations/`.
- **Server Actions**: `src/lib/actions/` y `src/lib/*-actions.ts`.
- **Validación**: `src/lib/schemas.ts`.
- **Middleware (proxy)**: `src/proxy.ts` — protección de rutas, rate limiting, redirección de cambio de contraseña.
- **Design System**: `src/components/ui/`; tokens en `src/app/globals.css`.
- **Emails**: `src/emails/`; envío en `src/lib/email-service.ts`.

---

## Documentación

- [Índice de documentación](./docs/INDEX.md)
- [Arquitectura](./docs/architecture/ARCHITECTURE.md)
- [Seguridad — Autenticación](./docs/security/authentication.md)
- [Seguridad — RBAC](./docs/security/rbac.md)
- [Seguridad — Tenant Isolation](./docs/security/tenant-isolation.md)
- [Seguridad — Guías](./docs/security/security-guidelines.md)
- [Desarrollo — Getting Started](./docs/development/getting-started.md)
- [Desarrollo — Reglas obligatorias](./docs/development/rules.md)
- [Roadmap Central](./docs/ROADMAP_MASTER.md)

---

**Gestión eficiente para talleres modernos.**
