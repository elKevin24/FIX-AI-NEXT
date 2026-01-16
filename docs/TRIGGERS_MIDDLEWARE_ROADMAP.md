# Hoja de Ruta: Triggers y Middleware para FIX-AI-NEXT

**Fecha:** 2026-01-15
**Versión:** 1.0
**Objetivo:** Implementar una estrategia híbrida de triggers de PostgreSQL y Prisma Middleware para mejorar la integridad de datos, audit logging y automatización.

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Fase 1: Triggers de PostgreSQL](#fase-1-triggers-de-postgresql)
3. [Fase 2: Prisma Middleware](#fase-2-prisma-middleware)
4. [Fase 3: Testing y Validación](#fase-3-testing-y-validación)
5. [Fase 4: Documentación y Mantenimiento](#fase-4-documentación-y-mantenimiento)

---

## Visión General

### Estrategia Híbrida

```
┌─────────────────────────────────────────────────────────────┐
│                     APLICACIÓN FIX-AI                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌──────────────────────┐    │
│  │  Prisma Middleware  │      │  Lógica de Negocio   │    │
│  ├─────────────────────┤      ├──────────────────────┤    │
│  │ • Audit Logging     │      │ • Validaciones       │    │
│  │ • Tenant Isolation  │      │ • Transacciones      │    │
│  │ • Auto Timestamps   │      │ • Notificaciones     │    │
│  │ • Soft Deletes      │      │ • Stock Atómico      │    │
│  └─────────┬───────────┘      └──────────┬───────────┘    │
│            │                             │                 │
│            └──────────┬──────────────────┘                 │
│                       ▼                                     │
│            ┌──────────────────────┐                        │
│            │   Prisma Client      │                        │
│            └──────────┬───────────┘                        │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS PostgreSQL                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Triggers de PostgreSQL                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ • Prevenir stock negativo (CONSTRAINT)              │  │
│  │ • Auto-generar ticketNumber                          │  │
│  │ • Auto-generar invoiceNumber                         │  │
│  │ • Validar fechas (dueDate > createdAt)              │  │
│  │ • Actualizar timestamps (updatedAt)                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Decisión: ¿Trigger o Middleware?

| Criterio | Trigger PostgreSQL | Prisma Middleware | Lógica de App |
|----------|-------------------|-------------------|---------------|
| **Validación de integridad crítica** | ✅ | ❌ | ❌ |
| **Auto-generar IDs/números** | ✅ | ⚠️ | ❌ |
| **Timestamps (updatedAt)** | ✅ | ✅ | ❌ |
| **Audit logging** | ❌ | ✅ | ⚠️ |
| **Tenant isolation** | ⚠️ | ✅ | ✅ |
| **Validaciones de negocio complejas** | ❌ | ⚠️ | ✅ |
| **Llamadas externas (emails, APIs)** | ❌ | ❌ | ✅ |
| **Transacciones multi-tabla** | ⚠️ | ❌ | ✅ |

---

## Fase 1: Triggers de PostgreSQL

**Duración estimada:** 3-4 horas
**Prioridad:** Alta
**Objetivo:** Implementar triggers de base de datos para validaciones críticas e integridad de datos.

### 1.1 Trigger: Prevenir Stock Negativo

**Propósito:** Garantizar que el stock de repuestos nunca sea negativo, incluso si la lógica de aplicación falla.

**Archivo:** `prisma/migrations/[timestamp]_add_prevent_negative_stock_trigger.sql`

```sql
-- ============================================================================
-- TRIGGER: Prevenir Stock Negativo
-- ============================================================================
-- Propósito: Validación adicional para garantizar que Part.quantity >= 0
-- Nota: La lógica de aplicación ya maneja esto con atomic updates,
--       pero este trigger es una capa adicional de seguridad.

CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que la cantidad no sea negativa
    IF NEW.quantity < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for part: % (SKU: %). Current: %, Attempted: %',
            NEW.name,
            NEW.sku,
            OLD.quantity,
            NEW.quantity
        USING HINT = 'Check stock availability before decrementing',
              ERRCODE = 'check_violation';
    END IF;

    -- Validar que minStock sea razonable
    IF NEW."minStock" < 0 THEN
        RAISE EXCEPTION 'Minimum stock cannot be negative';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger BEFORE UPDATE (ejecuta antes de actualizar)
DROP TRIGGER IF EXISTS check_part_stock_before_update ON "Part";
CREATE TRIGGER check_part_stock_before_update
    BEFORE UPDATE OF quantity ON "Part"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_negative_stock();

-- Crear trigger BEFORE INSERT (ejecuta antes de insertar)
DROP TRIGGER IF EXISTS check_part_stock_before_insert ON "Part";
CREATE TRIGGER check_part_stock_before_insert
    BEFORE INSERT ON "Part"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_negative_stock();

-- Comentario para documentación
COMMENT ON FUNCTION prevent_negative_stock() IS
'Previene que el stock de repuestos sea negativo. Capa adicional de seguridad sobre atomic updates.';
```

**Testing:**
```sql
-- Test 1: Intentar insertar con stock negativo (debe fallar)
INSERT INTO "Part" ("id", "name", "sku", "quantity", "price", "minStock", "tenantId")
VALUES ('test-1', 'Test Part', 'TEST-001', -5, 10.00, 5, 'tenant-1');
-- Esperado: ERROR - Stock cannot be negative

-- Test 2: Intentar actualizar a stock negativo (debe fallar)
UPDATE "Part" SET quantity = -1 WHERE id = 'existing-part-id';
-- Esperado: ERROR - Stock cannot be negative

-- Test 3: Actualizar a 0 (debe pasar)
UPDATE "Part" SET quantity = 0 WHERE id = 'existing-part-id';
-- Esperado: SUCCESS
```

---

### 1.2 Trigger: Auto-generar Ticket Number

**Propósito:** Generar números secuenciales de ticket por tenant, garantizando unicidad.

**Archivo:** `prisma/migrations/[timestamp]_add_auto_ticket_number_trigger.sql`

```sql
-- ============================================================================
-- TRIGGER: Auto-generar Ticket Number
-- ============================================================================
-- Propósito: Generar ticketNumber secuencial por tenant
-- Formato: 1, 2, 3, ... (único por tenant)

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Solo generar si ticketNumber es NULL
    IF NEW."ticketNumber" IS NULL THEN
        -- Obtener el siguiente número disponible para el tenant
        -- Usa FOR UPDATE para prevenir race conditions
        SELECT COALESCE(MAX("ticketNumber"), 0) + 1
        INTO next_number
        FROM "Ticket"
        WHERE "tenantId" = NEW."tenantId"
        FOR UPDATE;

        -- Asignar el número
        NEW."ticketNumber" = next_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS auto_generate_ticket_number ON "Ticket";
CREATE TRIGGER auto_generate_ticket_number
    BEFORE INSERT ON "Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

COMMENT ON FUNCTION generate_ticket_number() IS
'Genera ticketNumber secuencial por tenant. Usa FOR UPDATE para prevenir duplicados.';
```

**Nota importante:** Este trigger usa `FOR UPDATE` dentro de una función de trigger, lo cual **requiere que la inserción esté dentro de una transacción**. Prisma ya hace esto por defecto.

**Alternativa más segura (recomendada):** Usar SEQUENCE por tenant

```sql
-- Alternativa: Crear tabla de secuencias por tenant
CREATE TABLE IF NOT EXISTS "TicketSequence" (
    "tenantId" TEXT PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TicketSequence_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION generate_ticket_number_safe()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    IF NEW."ticketNumber" IS NULL THEN
        -- Insertar o actualizar secuencia atómicamente
        INSERT INTO "TicketSequence" ("tenantId", "lastNumber")
        VALUES (NEW."tenantId", 1)
        ON CONFLICT ("tenantId")
        DO UPDATE SET "lastNumber" = "TicketSequence"."lastNumber" + 1
        RETURNING "lastNumber" INTO next_number;

        NEW."ticketNumber" = next_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_ticket_number ON "Ticket";
CREATE TRIGGER auto_generate_ticket_number
    BEFORE INSERT ON "Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number_safe();
```

**Testing:**
```sql
-- Test: Crear 3 tickets y verificar numeración secuencial
INSERT INTO "Ticket" (...) VALUES (...); -- ticketNumber = 1
INSERT INTO "Ticket" (...) VALUES (...); -- ticketNumber = 2
INSERT INTO "Ticket" (...) VALUES (...); -- ticketNumber = 3

-- Verificar
SELECT "ticketNumber" FROM "Ticket" WHERE "tenantId" = 'test-tenant' ORDER BY "createdAt";
```

---

### 1.3 Trigger: Auto-generar Invoice Number

**Propósito:** Similar a ticket number, pero para facturas.

**Archivo:** `prisma/migrations/[timestamp]_add_auto_invoice_number_trigger.sql`

```sql
-- ============================================================================
-- TRIGGER: Auto-generar Invoice Number
-- ============================================================================
-- Propósito: Generar invoiceNumber secuencial por tenant
-- Formato: Puede ser YYYY-0001, YYYY-0002 (según regulaciones de Guatemala)

CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("tenantId", "year"),
    CONSTRAINT "InvoiceSequence_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    IF NEW."invoiceNumber" IS NULL THEN
        -- Obtener año actual
        current_year := EXTRACT(YEAR FROM CURRENT_DATE);

        -- Obtener siguiente número para este tenant y año
        INSERT INTO "InvoiceSequence" ("tenantId", "year", "lastNumber")
        VALUES (NEW."tenantId", current_year, 1)
        ON CONFLICT ("tenantId", "year")
        DO UPDATE SET "lastNumber" = "InvoiceSequence"."lastNumber" + 1
        RETURNING "lastNumber" INTO next_number;

        -- Formatear según regulaciones guatemaltecas (ejemplo: 2026-0001)
        formatted_number := current_year || '-' || LPAD(next_number::TEXT, 4, '0');

        NEW."invoiceNumber" = formatted_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_invoice_number ON "Invoice";
CREATE TRIGGER auto_generate_invoice_number
    BEFORE INSERT ON "Invoice"
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

COMMENT ON FUNCTION generate_invoice_number() IS
'Genera invoiceNumber con formato YYYY-0001 según regulaciones guatemaltecas.';
```

---

### 1.4 Trigger: Validar Fechas Lógicas

**Propósito:** Garantizar que las fechas tengan sentido lógico (ej: dueDate > createdAt).

**Archivo:** `prisma/migrations/[timestamp]_add_validate_dates_trigger.sql`

```sql
-- ============================================================================
-- TRIGGER: Validar Fechas Lógicas
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_ticket_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que dueDate sea posterior a createdAt (si existe)
    IF NEW."dueDate" IS NOT NULL AND NEW."dueDate" < NEW."createdAt" THEN
        RAISE EXCEPTION 'Due date (%) cannot be before creation date (%)',
            NEW."dueDate",
            NEW."createdAt"
        USING HINT = 'Ensure dueDate is in the future relative to createdAt';
    END IF;

    -- Validar que resolvedAt no sea anterior a createdAt
    IF NEW."resolvedAt" IS NOT NULL AND NEW."resolvedAt" < NEW."createdAt" THEN
        RAISE EXCEPTION 'Resolved date cannot be before creation date';
    END IF;

    -- Validar que closedAt no sea anterior a createdAt
    IF NEW."closedAt" IS NOT NULL AND NEW."closedAt" < NEW."createdAt" THEN
        RAISE EXCEPTION 'Closed date cannot be before creation date';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_dates_before_insert ON "Ticket";
CREATE TRIGGER validate_dates_before_insert
    BEFORE INSERT ON "Ticket"
    FOR EACH ROW
    EXECUTE FUNCTION validate_ticket_dates();

DROP TRIGGER IF EXISTS validate_dates_before_update ON "Ticket";
CREATE TRIGGER validate_dates_before_update
    BEFORE UPDATE ON "Ticket"
    FOR EACH ROW
    WHEN (
        NEW."dueDate" IS DISTINCT FROM OLD."dueDate" OR
        NEW."resolvedAt" IS DISTINCT FROM OLD."resolvedAt" OR
        NEW."closedAt" IS DISTINCT FROM OLD."closedAt"
    )
    EXECUTE FUNCTION validate_ticket_dates();
```

---

### 1.5 Trigger: Auto-actualizar updatedAt

**Propósito:** Actualizar automáticamente `updatedAt` en cada UPDATE.

**Archivo:** `prisma/migrations/[timestamp]_add_auto_updated_at_trigger.sql`

```sql
-- ============================================================================
-- TRIGGER: Auto-actualizar updatedAt
-- ============================================================================
-- Propósito: Actualizar updatedAt automáticamente en cada UPDATE
-- Nota: Esto es un backup del middleware de Prisma

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas relevantes
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'Ticket', 'Customer', 'Part', 'ServiceTemplate',
            'Invoice', 'User', 'Tenant'
        )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON "%I";
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON "%I"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END;
$$;
```

---

## Fase 2: Prisma Middleware

**Duración estimada:** 4-5 horas
**Prioridad:** Alta
**Objetivo:** Implementar middleware de Prisma para audit logging, tenant isolation y lógica de aplicación.

### 2.1 Setup de Middleware

**Archivo:** `src/lib/prisma-middleware.ts`

```typescript
import { Prisma, PrismaClient } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export type MiddlewareContext = {
  tenantId: string;
  userId: string;
  action?: string;
};

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/**
 * Configura todos los middlewares de Prisma
 * @param prisma - Instancia de PrismaClient
 * @param context - Contexto de usuario y tenant
 */
export function setupPrismaMiddleware(
  prisma: PrismaClient,
  context: MiddlewareContext
) {
  // 1. Tenant Isolation (más crítico - ejecuta primero)
  setupTenantIsolationMiddleware(prisma, context);

  // 2. Audit Logging
  setupAuditLoggingMiddleware(prisma, context);

  // 3. Auto Timestamps (updatedAt, updatedById)
  setupAutoTimestampsMiddleware(prisma, context);

  // 4. Soft Deletes
  setupSoftDeleteMiddleware(prisma);

  return prisma;
}

// ============================================================================
// MIDDLEWARE 1: Tenant Isolation
// ============================================================================

/**
 * Garantiza que todas las queries filtren por tenantId automáticamente
 */
function setupTenantIsolationMiddleware(
  prisma: PrismaClient,
  context: MiddlewareContext
) {
  // Lista de modelos que requieren tenant isolation
  const tenantModels = [
    'Ticket',
    'Customer',
    'Part',
    'PartUsage',
    'ServiceTemplate',
    'ServiceTemplateDefaultPart',
    'Invoice',
    'Payment',
    'AuditLog',
    'Notification',
    'TicketNote',
    'TechnicianUnavailability',
  ];

  prisma.$use(async (params, next) => {
    // Solo aplicar a modelos con tenant
    if (!tenantModels.includes(params.model || '')) {
      return next(params);
    }

    // CREATE: Agregar tenantId automáticamente
    if (params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        tenantId: context.tenantId,
      };
    }

    // CREATE MANY: Agregar tenantId a todos los registros
    if (params.action === 'createMany') {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => ({
          ...item,
          tenantId: context.tenantId,
        }));
      } else {
        params.args.data = {
          ...params.args.data,
          tenantId: context.tenantId,
        };
      }
    }

    // READ: Filtrar por tenantId
    if (
      ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(
        params.action
      )
    ) {
      params.args.where = {
        ...params.args.where,
        tenantId: context.tenantId,
      };
    }

    // UPDATE/DELETE: Filtrar por tenantId
    if (
      ['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)
    ) {
      params.args.where = {
        ...params.args.where,
        tenantId: context.tenantId,
      };
    }

    return next(params);
  });
}

// ============================================================================
// MIDDLEWARE 2: Audit Logging
// ============================================================================

/**
 * Registra todas las operaciones de modificación en AuditLog
 */
function setupAuditLoggingMiddleware(
  prisma: PrismaClient,
  context: MiddlewareContext
) {
  // Modelos que deben auditarse
  const auditableModels = [
    'Ticket',
    'Customer',
    'Part',
    'ServiceTemplate',
    'Invoice',
    'Payment',
    'User',
  ];

  // Acciones que deben auditarse
  const auditableActions = ['create', 'update', 'updateMany', 'delete', 'deleteMany'];

  prisma.$use(async (params, next) => {
    if (
      !auditableModels.includes(params.model || '') ||
      !auditableActions.includes(params.action)
    ) {
      return next(params);
    }

    const before = Date.now();
    const result = await next(params);
    const duration = Date.now() - before;

    // Crear audit log de forma asíncrona (no bloquea la operación)
    prisma.auditLog
      .create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          action: params.action.toUpperCase(),
          model: params.model || 'UNKNOWN',
          recordId: result?.id || null,
          changes: JSON.stringify(params.args),
          duration,
          timestamp: new Date(),
          ipAddress: context.action || null, // Si tienes acceso a IP
        },
      })
      .catch((err) => {
        // Log error pero no fallar la operación principal
        console.error('[Audit Log Error]:', err);
      });

    return result;
  });
}

// ============================================================================
// MIDDLEWARE 3: Auto Timestamps
// ============================================================================

/**
 * Actualiza automáticamente updatedAt y updatedById
 */
function setupAutoTimestampsMiddleware(
  prisma: PrismaClient,
  context: MiddlewareContext
) {
  const modelsWithTimestamps = [
    'Ticket',
    'Customer',
    'Part',
    'ServiceTemplate',
    'Invoice',
    'User',
  ];

  prisma.$use(async (params, next) => {
    if (!modelsWithTimestamps.includes(params.model || '')) {
      return next(params);
    }

    // CREATE: Agregar createdById y updatedById
    if (params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        createdById: context.userId,
        updatedById: context.userId,
      };
    }

    // UPDATE: Agregar updatedById y updatedAt
    if (params.action === 'update' || params.action === 'updateMany') {
      params.args.data = {
        ...params.args.data,
        updatedById: context.userId,
        updatedAt: new Date(),
      };
    }

    return next(params);
  });
}

// ============================================================================
// MIDDLEWARE 4: Soft Deletes
// ============================================================================

/**
 * Implementa soft deletes (marca como deleted en lugar de borrar)
 */
function setupSoftDeleteMiddleware(prisma: PrismaClient) {
  // Modelos con soft delete (requieren campo deletedAt)
  const softDeleteModels = ['Customer', 'Part', 'ServiceTemplate'];

  prisma.$use(async (params, next) => {
    if (!softDeleteModels.includes(params.model || '')) {
      return next(params);
    }

    // DELETE: Convertir a UPDATE con deletedAt
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    // DELETE MANY: Convertir a UPDATE MANY
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
    }

    // FIND: Excluir registros borrados
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    return next(params);
  });
}
```

---

### 2.2 Integración con tenant-prisma.ts

**Archivo:** `src/lib/tenant-prisma.ts` (modificar)

```typescript
import { PrismaClient } from '@prisma/client';
import { setupPrismaMiddleware } from './prisma-middleware';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Obtiene una instancia de Prisma con middlewares configurados
 * para un tenant y usuario específicos
 */
export function getTenantPrisma(tenantId: string, userId: string) {
  // Crear nueva instancia o usar existente
  const client = prisma;

  // Configurar middlewares con contexto
  setupPrismaMiddleware(client, { tenantId, userId });

  return client;
}
```

---

## Fase 3: Testing y Validación

**Duración estimada:** 3-4 horas
**Prioridad:** Alta

### 3.1 Tests de Triggers

**Archivo:** `tests/triggers/stock-validation.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

describe('Trigger: Prevent Negative Stock', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should prevent inserting part with negative stock', async () => {
    await expect(
      prisma.part.create({
        data: {
          name: 'Test Part',
          sku: 'TEST-001',
          quantity: -5, // Negativo
          price: 10,
          minStock: 5,
          tenantId: 'test-tenant',
        },
      })
    ).rejects.toThrow('Stock cannot be negative');
  });

  it('should prevent updating to negative stock', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Test Part',
        sku: 'TEST-002',
        quantity: 10,
        price: 10,
        minStock: 5,
        tenantId: 'test-tenant',
      },
    });

    await expect(
      prisma.part.update({
        where: { id: part.id },
        data: { quantity: -1 },
      })
    ).rejects.toThrow('Stock cannot be negative');
  });

  it('should allow updating to zero stock', async () => {
    const part = await prisma.part.create({
      data: {
        name: 'Test Part',
        sku: 'TEST-003',
        quantity: 10,
        price: 10,
        minStock: 5,
        tenantId: 'test-tenant',
      },
    });

    const updated = await prisma.part.update({
      where: { id: part.id },
      data: { quantity: 0 },
    });

    expect(updated.quantity).toBe(0);
  });
});
```

### 3.2 Tests de Middleware

**Archivo:** `tests/middleware/tenant-isolation.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { setupPrismaMiddleware } from '@/lib/prisma-middleware';

describe('Middleware: Tenant Isolation', () => {
  const prisma = new PrismaClient();

  beforeAll(() => {
    setupPrismaMiddleware(prisma, {
      tenantId: 'tenant-a',
      userId: 'user-1',
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should automatically add tenantId on create', async () => {
    const customer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        // No especificamos tenantId
      },
    });

    expect(customer.tenantId).toBe('tenant-a');
  });

  it('should filter by tenantId on findMany', async () => {
    // Crear customers en diferentes tenants (sin middleware)
    const prismaRaw = new PrismaClient();
    await prismaRaw.customer.create({
      data: { name: 'Customer A', tenantId: 'tenant-a' },
    });
    await prismaRaw.customer.create({
      data: { name: 'Customer B', tenantId: 'tenant-b' },
    });

    // Buscar con middleware (debe filtrar)
    const customers = await prisma.customer.findMany();

    expect(customers).toHaveLength(1);
    expect(customers[0].tenantId).toBe('tenant-a');
  });
});
```

---

## Fase 4: Documentación y Mantenimiento

**Duración estimada:** 2 horas
**Prioridad:** Media

### 4.1 Crear Scripts de Gestión

**Archivo:** `scripts/manage-triggers.sh`

```bash
#!/bin/bash
# Script para gestionar triggers de PostgreSQL

DATABASE_URL=${DATABASE_URL:-"postgresql://user:password@localhost:5432/fixai"}

case "$1" in
  list)
    echo "Listing all triggers..."
    psql "$DATABASE_URL" -c "
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    "
    ;;

  enable)
    echo "Enabling all triggers..."
    psql "$DATABASE_URL" -c "
      DO \$\$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN SELECT trigger_name, event_object_table
                   FROM information_schema.triggers
                   WHERE trigger_schema = 'public'
          LOOP
              EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I',
                           r.event_object_table, r.trigger_name);
          END LOOP;
      END;
      \$\$;
    "
    ;;

  disable)
    echo "Disabling all triggers (USE WITH CAUTION)..."
    psql "$DATABASE_URL" -c "
      DO \$\$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN SELECT trigger_name, event_object_table
                   FROM information_schema.triggers
                   WHERE trigger_schema = 'public'
          LOOP
              EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I',
                           r.event_object_table, r.trigger_name);
          END LOOP;
      END;
      \$\$;
    "
    ;;

  test)
    echo "Testing triggers..."
    npm run test:triggers
    ;;

  *)
    echo "Usage: $0 {list|enable|disable|test}"
    exit 1
    ;;
esac
```

### 4.2 Documentación de Referencia

**Archivo:** `docs/TRIGGERS_REFERENCE.md`

```markdown
# Referencia de Triggers y Middleware

## Triggers Implementados

### 1. prevent_negative_stock()
- **Tabla:** Part
- **Timing:** BEFORE INSERT, BEFORE UPDATE
- **Propósito:** Prevenir stock negativo
- **Cómo desactivar (emergencia):**
  ```sql
  ALTER TABLE "Part" DISABLE TRIGGER check_part_stock_before_update;
  ```

### 2. generate_ticket_number()
- **Tabla:** Ticket
- **Timing:** BEFORE INSERT
- **Propósito:** Auto-generar números secuenciales
- **Notas:** Requiere tabla TicketSequence

### 3. generate_invoice_number()
- **Tabla:** Invoice
- **Timing:** BEFORE INSERT
- **Propósito:** Auto-generar números con formato YYYY-0001
- **Notas:** Requiere tabla InvoiceSequence

## Middleware Implementado

### 1. Tenant Isolation
- **Modelos:** Ticket, Customer, Part, ServiceTemplate, etc.
- **Acciones:** Todas (CREATE, READ, UPDATE, DELETE)
- **Cómo desactivar:** No configurar middleware en getTenantPrisma()

### 2. Audit Logging
- **Modelos:** Ticket, Customer, Part, ServiceTemplate, Invoice, Payment, User
- **Acciones:** CREATE, UPDATE, DELETE
- **Storage:** Tabla AuditLog

### 3. Auto Timestamps
- **Modelos:** Todos los principales
- **Campos:** updatedAt, updatedById, createdById

## Troubleshooting

### Problema: Trigger está bloqueando operación válida
```sql
-- Desactivar temporalmente
ALTER TABLE "TableName" DISABLE TRIGGER trigger_name;
-- Realizar operación
-- Re-activar
ALTER TABLE "TableName" ENABLE TRIGGER trigger_name;
```

### Problema: Middleware causando performance issues
- Revisar audit logs asíncronos
- Considerar batch logging
- Usar cache para tenant isolation
```

---

## Cronograma de Implementación

### Semana 1: Triggers
- **Día 1:** Implementar triggers de stock negativo + testing
- **Día 2:** Implementar auto-generación de números + testing
- **Día 3:** Implementar validación de fechas + auto-updatedAt

### Semana 2: Middleware
- **Día 1:** Implementar tenant isolation middleware
- **Día 2:** Implementar audit logging middleware
- **Día 3:** Implementar auto timestamps + soft deletes
- **Día 4:** Testing completo de middleware

### Semana 3: Testing y Docs
- **Día 1-2:** Testing de integración
- **Día 3:** Documentación y scripts de gestión
- **Día 4:** Review y ajustes finales

---

## Checklist de Implementación

### Triggers PostgreSQL
- [ ] Crear migración para prevent_negative_stock
- [ ] Crear migración para auto-generar ticket numbers
- [ ] Crear migración para auto-generar invoice numbers
- [ ] Crear migración para validar fechas
- [ ] Crear migración para auto-updatedAt
- [ ] Escribir tests para cada trigger
- [ ] Validar performance de triggers

### Prisma Middleware
- [ ] Crear archivo prisma-middleware.ts
- [ ] Implementar tenant isolation middleware
- [ ] Implementar audit logging middleware
- [ ] Implementar auto timestamps middleware
- [ ] Implementar soft deletes middleware
- [ ] Integrar con tenant-prisma.ts
- [ ] Escribir tests para cada middleware
- [ ] Validar performance de middleware

### Documentación
- [ ] Crear TRIGGERS_REFERENCE.md
- [ ] Crear scripts de gestión (manage-triggers.sh)
- [ ] Documentar troubleshooting
- [ ] Actualizar README con información de triggers/middleware

### Testing
- [ ] Tests unitarios de triggers
- [ ] Tests unitarios de middleware
- [ ] Tests de integración
- [ ] Tests de performance
- [ ] Tests de tenant isolation

---

## Métricas de Éxito

1. **Integridad de Datos:** 0 casos de stock negativo en producción
2. **Performance:** < 10ms overhead por operación con middleware
3. **Audit Coverage:** 100% de operaciones críticas auditadas
4. **Tenant Isolation:** 0 violaciones de tenant en 30 días
5. **Tests:** >90% coverage en triggers y middleware

---

## Notas Finales

- ⚠️ **Importante:** Siempre testear triggers en ambiente de desarrollo antes de producción
- ⚠️ **Backup:** Hacer backup de BD antes de aplicar triggers
- ⚠️ **Performance:** Monitorear performance después de implementar middleware
- ⚠️ **Rollback:** Tener plan de rollback para cada trigger/middleware

---

**Última actualización:** 2026-01-15
**Revisado por:** [Tu nombre]
**Estado:** Draft - Pendiente de implementación
