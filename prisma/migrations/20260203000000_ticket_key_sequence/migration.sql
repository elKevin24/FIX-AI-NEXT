-- ================================================
-- Migration: Ticket Key Sequence System
-- Description: Implements atomic ticket key generation
--              with format SAT-YYYY-NNNNN per tenant/year
-- ================================================

-- Ensure necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create uuidv7() fallback if not provided by the DB
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuidv7') THEN
    -- Fallback to gen_random_uuid() for environments without a native uuidv7 provider.
    -- This keeps migrations runnable; deployers should install a true uuidv7 provider
    -- for canonical v7 timestamps if desired.
    CREATE OR REPLACE FUNCTION uuidv7()
    RETURNS uuid AS $$
    BEGIN
      RETURN gen_random_uuid();
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- 1. Create ticket_sequences table with composite primary key
CREATE TABLE IF NOT EXISTS "ticket_sequences" (
    "tenant_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("tenant_id", "year"),
    CONSTRAINT "ticket_sequences_tenant_id_fkey"
        FOREIGN KEY ("tenant_id")
        REFERENCES "tenants"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 2. Atomic function to get next ticket key
-- Uses INSERT ON CONFLICT (UPSERT) for atomicity without explicit locking
CREATE OR REPLACE FUNCTION next_ticket_key(p_tenant_id UUID, p_year INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_next_value INTEGER;
    v_ticket_key VARCHAR(20);
BEGIN
    INSERT INTO ticket_sequences (tenant_id, year, last_value)
    VALUES (p_tenant_id, p_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_value = ticket_sequences.last_value + 1
    RETURNING last_value INTO v_next_value;

    v_ticket_key := 'SAT-' || p_year::TEXT || '-' || LPAD(v_next_value::TEXT, 5, '0');
    RETURN v_ticket_key;
END;
$$ LANGUAGE plpgsql;

-- 3. Rename ticketNumber to ticket_key and add column if necessary
DROP INDEX IF EXISTS "tickets_ticketNumber_tenantId_key";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'ticketNumber'
    ) THEN
        ALTER TABLE "tickets" RENAME COLUMN "ticketNumber" TO "ticket_key";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'ticket_key'
    ) THEN
        ALTER TABLE "tickets" ADD COLUMN "ticket_key" VARCHAR(20);
    END IF;
END $$;

-- 4. Migrate existing tickets that don't have a ticket_key
DO $$
DECLARE
    r RECORD;
    v_year INTEGER;
    v_seq INTEGER;
BEGIN
    FOR r IN
        SELECT id, "tenantId", "createdAt"
        FROM tickets
        WHERE ticket_key IS NULL
        ORDER BY "createdAt" ASC
    LOOP
        v_year := EXTRACT(YEAR FROM r."createdAt")::INTEGER;

        INSERT INTO ticket_sequences (tenant_id, year, last_value)
        VALUES (r."tenantId", v_year, 1)
        ON CONFLICT (tenant_id, year)
        DO UPDATE SET last_value = ticket_sequences.last_value + 1
        RETURNING last_value INTO v_seq;

        UPDATE tickets
        SET ticket_key = 'SAT-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0')
        WHERE id = r.id;
    END LOOP;
END $$;

-- 5. Make ticket_key NOT NULL and UNIQUE after migration
ALTER TABLE "tickets" ALTER COLUMN "ticket_key" SET NOT NULL;
-- Unicidad por tenant para evitar colisiones entre talleres
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_key_per_tenant" ON "tickets"("tenantId", "ticket_key");

-- 6. Create index for fuzzy search on ticket_key
CREATE INDEX IF NOT EXISTS "idx_tickets_key_trgm" ON "tickets" USING GIN ("ticket_key" gin_trgm_ops);

-- 7. Update trigger to use new function
CREATE OR REPLACE FUNCTION assign_ticket_key()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
BEGIN
    IF NEW."ticket_key" IS NULL OR NEW."ticket_key" = '' THEN
        v_year := EXTRACT(YEAR FROM COALESCE(NEW."createdAt", NOW()))::INTEGER;
        NEW."ticket_key" := next_ticket_key(NEW."tenantId", v_year);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON tickets;
DROP TRIGGER IF EXISTS trg_assign_ticket_key ON tickets;
CREATE TRIGGER trg_assign_ticket_key
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION assign_ticket_key();

-- 8. Ensure tenantId index exists on tickets
CREATE INDEX IF NOT EXISTS "tickets_tenantId_idx" ON "tickets"("tenantId");
