-- =====================================================
-- Migration: Ticket Key Sequence System
-- Description: Implements atomic ticket key generation
--              with format SAT-YYYY-NNNNN per tenant/year
-- =====================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    -- Atomic upsert: insert new row or increment existing
    INSERT INTO ticket_sequences (tenant_id, year, last_value)
    VALUES (p_tenant_id, p_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_value = ticket_sequences.last_value + 1
    RETURNING last_value INTO v_next_value;

    -- Format: SAT-2025-00001 (5 digits, zero-padded)
    v_ticket_key := 'SAT-' || p_year::TEXT || '-' || LPAD(v_next_value::TEXT, 5, '0');

    RETURN v_ticket_key;
END;
$$ LANGUAGE plpgsql;

-- 3. Rename ticketNumber to ticketKey and change constraints
-- First, drop the old unique constraint if it exists
DROP INDEX IF EXISTS "tickets_ticketNumber_tenantId_key";

-- Rename column if it exists (for existing databases)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tickets' AND column_name = 'ticketNumber'
    ) THEN
        ALTER TABLE "tickets" RENAME COLUMN "ticketNumber" TO "ticket_key";
    END IF;
END $$;

-- Add ticketKey column if it doesn't exist
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
-- Generate keys for existing tickets based on creation order
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

        -- Get next sequence for this tenant/year
        INSERT INTO ticket_sequences (tenant_id, year, last_value)
        VALUES (r."tenantId", v_year, 1)
        ON CONFLICT (tenant_id, year)
        DO UPDATE SET last_value = ticket_sequences.last_value + 1
        RETURNING last_value INTO v_seq;

        -- Update the ticket
        UPDATE tickets
        SET ticket_key = 'SAT-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0')
        WHERE id = r.id;
    END LOOP;
END $$;

-- 5. Make ticket_key NOT NULL and UNIQUE after migration
ALTER TABLE "tickets" ALTER COLUMN "ticket_key" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_key_unique" ON "tickets"("ticket_key");

-- 6. Create index for fuzzy search on ticket_key
CREATE INDEX IF NOT EXISTS "idx_tickets_key_trgm" ON "tickets" USING GIN ("ticket_key" gin_trgm_ops);

-- 7. Update trigger to use new function
CREATE OR REPLACE FUNCTION assign_ticket_key()
RETURNS TRIGGER AS $$
DECLARE
    v_year INTEGER;
BEGIN
    -- Only assign if ticket_key is not provided
    IF NEW."ticket_key" IS NULL OR NEW."ticket_key" = '' THEN
        v_year := EXTRACT(YEAR FROM COALESCE(NEW."createdAt", NOW()))::INTEGER;
        NEW."ticket_key" := next_ticket_key(NEW."tenantId", v_year);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_assign_ticket_number ON tickets;

-- Create new trigger
DROP TRIGGER IF EXISTS trg_assign_ticket_key ON tickets;
CREATE TRIGGER trg_assign_ticket_key
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION assign_ticket_key();

-- 8. Update TicketStatus enum values (English to Spanish)
-- Note: PostgreSQL doesn't support ALTER TYPE for enum value changes
-- We need to create a new type and migrate

-- Check if old values exist and migrate to new
DO $$
BEGIN
    -- Only run if OPEN exists (old enum values)
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'OPEN'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TicketStatus')
    ) THEN
        -- Add new enum values if they don't exist
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ABIERTO';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'EN_PROCESO';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ESPERANDO_REPUESTOS';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESUELTO';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CERRADO';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELADO';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;

        -- Update existing tickets to use new values
        UPDATE tickets SET status = 'ABIERTO' WHERE status = 'OPEN';
        UPDATE tickets SET status = 'EN_PROCESO' WHERE status = 'IN_PROGRESS';
        UPDATE tickets SET status = 'ESPERANDO_REPUESTOS' WHERE status = 'WAITING_FOR_PARTS';
        UPDATE tickets SET status = 'RESUELTO' WHERE status = 'RESOLVED';
        UPDATE tickets SET status = 'CERRADO' WHERE status = 'CLOSED';
        UPDATE tickets SET status = 'CANCELADO' WHERE status = 'CANCELLED';
    END IF;
END $$;

-- 9. Add index on tenantId for tickets (if not exists)
CREATE INDEX IF NOT EXISTS "tickets_tenantId_idx" ON "tickets"("tenantId");
