# Multi-Tenancy / Tenant Isolation — FIX-AI NEXT

> Basado en el código real: `src/lib/tenant-prisma.ts`, `prisma/schema.prisma`, `src/lib/authz.ts`, `src/auth.ts`.

## Cómo se modela

- Modelo **shared database + shared schema**: cada taller = fila de la tabla `tenants`.
- Todo modelo tenanted lleva una columna escalar **`tenantId`** + relación `tenant`.
- No hay row-level security por defecto; el aislamiento lo impone **la capa de datos**.

## El mecanismo: `getTenantPrisma`

`src/lib/tenant-prisma.ts` exporta:

```ts
getTenantPrisma(tenantId: string, userId?: string): PrismaClient
```

Devuelve un cliente Prisma `$extends` que, para los modelos en `TENANTED_MODELS`, **inyecta `tenantId` automáticamente**:

| Operación | Comportamiento |
|-----------|----------------|
| `findMany` / `findFirst` / `count` / `aggregate` / `groupBy` / `updateMany` / `deleteMany` | añade `tenantId` al `where` |
| `findUnique` | se reescribe a `findFirst` escopetado (el `where` original solo con PK + `tenantId`) |
| `create` / `createMany` | añade `tenantId` (+ `createdById`/`updatedById` si se pasa `userId`) |
| `update` / `delete` | primero `findFirst` escopetado; si el registro no pertenece al tenant → lanza error `P2025` ("not found or unauthorized") |

`TENANTED_MODELS` (18): `Ticket, Customer, Part, Invoice, POSSale, Payment, Notification, CashTransaction, PurchaseOrder, AuditLog, ServiceTemplate, CashRegister, TenantSettings, POSQuotation, CreditNote, User, SessionLog, UserPresence`.

## Garantía de aislamiento

```
Usuario de Tenant A
   ↓  Obtiene session → session.user.tenantId === 'A'
   ↓  getTenantPrisma('A', userId)
   ↓  Prisma añade 'tenantId: A' a toda query
   ↓  Solo filas de Tenant A
```

Lo mismo para Tenant B. La clave es que **el `tenantId` proviene de la sesión autenticada**, nunca de entrada del cliente.

## Uso correcto

```ts
import { getTenantPrisma } from '@/lib/tenant-prisma';
const session = await auth();
const tenantId = session?.user?.tenantId;
if (!tenantId) throw new Error('tenantId requerido');
const db = getTenantPrisma(tenantId, session.user.id);
const tickets = await db.ticket.findMany({ /* sin tenantId manual */ });
```

## Modelos NO tenanted (hijos/join/públicos)

`Tenant`, `TicketSequence`, `TicketAttachment`, `PurchaseItem`, `PartUsage`, `TicketNote`, `TemplateDefaultPart`, `TicketService`, `TechnicianSpecialization`, `TechnicianUnavailability`, `InvoiceHistory`, `POSSaleItem`, `POSSalePayment`, `POSQuotationItem`, `CreditNoteItem`, `PasswordResetToken`.

Estos se acceden a través de sus padres tenanted o son globales/públicos (reescritura de password).

## Uso legítimo de `prisma` (no tenanted)

Casos intencionales donde se usa el cliente crudo para datos **globales o públicos** (no deben "contaminar" el aislamiento):
- Cron system-wide: `src/app/api/cron/*`, `src/lib/quotation-cron.ts`, `src/lib/sla-actions.ts` (recorren todos los tenants).
- Auth: `src/lib/actions/auth-actions.ts` (password reset por email — modelo `PasswordResetToken` global).
- Portal público: `src/lib/repositories/ticket.repository.ts` (`findPublicByIdOrNumber`, deliberadamente sin escopetado para búsqueda por número público).

## ⚠️ Puntos identificados de riesgo de fuga

1. **`src/lib/audit-actions.ts` (`getAuditLogs`)** — usa `prisma.auditLog.findMany` crudo y su chequeo de tenant es **incorrecto** (permite que un ADMIN lea auditoría de otro tenant). Debe migrar a `getTenantPrisma(tenantId)`.
2. **Otros imports de `prisma` crudo en server** para modelos tenanted — auditar cada uno para confirmar escopetado (p. ej. la ruta de attachments y delivery-receipt usan getTenantPrisma en el camino no-superadmin, pero revisa cualquier `import { prisma }`).
3. Las **rutas CRUD legacy** (`/api/users`, `/api/tickets`, `/api/customers`) deben usar `getTenantPrisma`; cualquier uso de `prisma` crudo en ellas para modelos tenanted libera el filtro.

## Regla

> Para **cualquier** consulta/esritura sobre un modelo tenanted, usa `getTenantPrisma(tenantId, userId)`. El `prisma` crudo queda solo para: sistemas globales (cron), auth por email, y el portal público por número de ticket.
