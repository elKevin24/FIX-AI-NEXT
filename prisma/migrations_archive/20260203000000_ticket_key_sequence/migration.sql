-- ================================================
-- Migration: Ticket Number Sequence System
-- Description: Implements atomic ticket number generation
--              with format SAT-YYYY-NNNNN per tenant/year
-- ================================================

-- Ensure necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create uuidv7() fallback if not provided by the DB
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuidv7') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION uuidv7()
      RETURNS uuid AS $func$
      BEGIN
        RETURN gen_random_uuid();
      END;
      $func$ LANGUAGE plpgsql;
    ';
  END IF;
END $$;

-- 1. Create ticket_sequences table with composite primary key
-- tenant_id matches the type of tenants.id (uuid on schema-driven DBs,
-- text on DBs created from the original migration history)
DO $$
DECLARE
  id_type TEXT;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO id_type
  FROM pg_attribute
  WHERE attrelid = 'tenants'::regclass AND attname = 'id' AND attnum > 0;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS "ticket_sequences" (
        "tenant_id" %s NOT NULL,
        "year" INTEGER NOT NULL,
        "last_value" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("tenant_id", "year")
    )',
    id_type
  );

  -- 2. Atomic function to get next ticket number
  -- Uses INSERT ON CONFLICT (UPSERT) for atomicity without explicit locking
  EXECUTE format($func$
    CREATE OR REPLACE FUNCTION next_ticket_number(p_tenant_id %s, p_year INTEGER)
    RETURNS VARCHAR(20) AS $body$
    DECLARE
        v_next_value INTEGER;
        v_ticket_number VARCHAR(20);
    BEGIN
        INSERT INTO ticket_sequences (tenant_id, year, last_value)
        VALUES (p_tenant_id, p_year, 1)
        ON CONFLICT (tenant_id, year)
        DO UPDATE SET last_value = ticket_sequences.last_value + 1
        RETURNING last_value INTO v_next_value;

        v_ticket_number := 'SAT-' || p_year::TEXT || '-' || LPAD(v_next_value::TEXT, 5, '0');
        RETURN v_ticket_number;
    END;
    $body$ LANGUAGE plpgsql;
  $func$, id_type);

  -- 3. FK constraint (tenant_id type now always matches tenants.id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_sequences_tenant_id_fkey'
  ) THEN
    ALTER TABLE "ticket_sequences"
    ADD CONSTRAINT "ticket_sequences_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Ensure ticketNumber column exists
-- If ticket_key exists, rename it to ticketNumber to standardize
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'ticket_key'
    ) THEN
        ALTER TABLE "tickets" RENAME COLUMN "ticket_key" TO "ticketNumber";
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'ticketNumber'
    ) THEN
        ALTER TABLE "tickets" ADD COLUMN "ticketNumber" VARCHAR(20);
    END IF;
END $$;

-- 5. Migrate existing tickets that don't have a ticketNumber
DO $$
DECLARE
    r RECORD;
    v_year INTEGER;
    v_seq INTEGER;
BEGIN
    FOR r IN
        SELECT id, "tenantId", "createdAt"
        FROM tickets
        WHERE "ticketNumber" IS NULL
        ORDER BY "createdAt" ASC
    LOOP
        v_year := EXTRACT(YEAR FROM r."createdAt")::INTEGER;

        INSERT INTO ticket_sequences (tenant_id, year, last_value)
        VALUES (r."tenantId", v_year, 1)
        ON CONFLICT (tenant_id, year)
        DO UPDATE SET last_value = ticket_sequences.last_value + 1
        RETURNING last_value INTO v_seq;

        UPDATE tickets
        SET "ticketNumber" = 'SAT-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0')
        WHERE id = r.id;
    END LOOP;
END $$;

-- 6. Make ticketNumber NOT NULL after migration
-- Note: We can't strictly enforce UNIQUE globally if we want per-tenant uniqueness,
-- but the index below handles the per-tenant requirement.
ALTER TABLE "tickets" ALTER COLUMN "ticketNumber" DROP NOT NULL; -- Allow NULL temporarily if needed, but aim for NOT NULL

-- Unicidad por tenant para evitar colisiones entre talleres
DROP INDEX IF EXISTS "tickets_ticket_key_per_tenant";
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketNumber_tenantId_key" ON "tickets"("ticketNumber", "tenantId");

-- 7. Create index for fuzzy search on ticketNumber
DROP INDEX IF EXISTS "idx_tickets_key_trgm";
CREATE INDEX IF NOT EXISTS "idx_tickets_number_trgm" ON "tickets" USING GIN ("ticketNumber" gin_trgm_ops);

-- 8. Update trigger to use new function
CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
BEGIN
    IF NEW."ticketNumber" IS NULL OR NEW."ticketNumber" = '' THEN
        v_year := EXTRACT(YEAR FROM COALESCE(NEW."createdAt", NOW()))::INTEGER;
        NEW."ticketNumber" := next_ticket_number(NEW."tenantId", v_year);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON tickets;
DROP TRIGGER IF EXISTS trg_assign_ticket_key ON tickets;

CREATE TRIGGER trg_assign_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION assign_ticket_number();

-- 9. Ensure tenantId index exists on tickets
CREATE INDEX IF NOT EXISTS "tickets_tenantId_idx" ON "tickets"("tenantId");
