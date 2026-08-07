-- Convert entity id columns and FK references from TEXT to UUID to match
-- prisma/schema.prisma. Uses ALTER COLUMN ... TYPE ... USING to preserve data.
--
-- DB-only objects intentionally preserved (they have no Prisma representation):
--   * trgm fuzzy-search indexes (idx_*_trgm) - used by src/lib/search-service.ts
--   * tickets_tenantId_idx (declared in schema as @@index([tenantId]))
-- The legacy audit_changes() trigger is dropped because it writes non-enum
-- actions (e.g. 'DB_INSERT_parts') without a module, invalid for the new enums.

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'ROLE_CHANGED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET', 'SESSION_EXPIRED', 'TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_DELETED', 'TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'PARTS_APPROVED', 'PARTS_REJECTED', 'CONFIG_CHANGED', 'TENANT_CONFIG_CHANGED', 'EXPORT_DATA', 'DATA_EXPORTED', 'MODULE_ACCESSED');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('AUTH', 'USERS', 'TICKETS', 'SETTINGS', 'REPORTS', 'DASHBOARD', 'INVENTORY', 'POS', 'BILLING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- The user_management_view depends on users.role; it must be dropped before
-- the column type can change, then recreated at the end of this migration.
DROP VIEW IF EXISTS "user_management_view";

-- RLS policies (created by 20260806184730_postgres_rls_policies) reference
-- tenantId columns and block ALTER COLUMN TYPE; drop them now and recreate
-- them at the end of this migration.
DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'users', 'customers', 'tickets', 'ticket_attachments', 'parts',
        'purchase_orders', 'purchase_items', 'audit_logs', 'ticket_notes',
        'service_templates', 'template_default_parts', 'ticket_services',
        'technician_specializations', 'technician_unavailabilities',
        'notifications', 'invoices', 'payments', 'cash_registers',
        'cash_transactions', 'tenant_settings', 'invoice_history',
        'pos_sales', 'pos_sale_items', 'pos_sale_payments', 'pos_quotations',
        'pos_quotation_items', 'credit_notes', 'credit_note_items',
        'session_logs', 'user_presence'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t_name);
        END IF;
    END LOOP;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER', 'TECHNICIAN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TECHNICIAN';
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "cash_registers" DROP CONSTRAINT "cash_registers_closedById_fkey";

-- DropForeignKey
ALTER TABLE "cash_registers" DROP CONSTRAINT "cash_registers_openedById_fkey";

-- DropForeignKey
ALTER TABLE "cash_registers" DROP CONSTRAINT "cash_registers_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_cashRegisterId_fkey";

-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_createdById_fkey";

-- DropForeignKey
ALTER TABLE "cash_transactions" DROP CONSTRAINT "cash_transactions_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "credit_note_items" DROP CONSTRAINT "credit_note_items_creditNoteId_fkey";

-- DropForeignKey
ALTER TABLE "credit_note_items" DROP CONSTRAINT "credit_note_items_partId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_createdById_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_customerId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_posSaleId_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_processedById_fkey";

-- DropForeignKey
ALTER TABLE "credit_notes" DROP CONSTRAINT "credit_notes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_createdById_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "invoice_history" DROP CONSTRAINT "invoice_history_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "invoice_history" DROP CONSTRAINT "invoice_history_userId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_createdById_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customerId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "part_usages" DROP CONSTRAINT "part_usages_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "part_usages" DROP CONSTRAINT "part_usages_partId_fkey";

-- DropForeignKey
ALTER TABLE "part_usages" DROP CONSTRAINT "part_usages_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "parts" DROP CONSTRAINT "parts_createdById_fkey";

-- DropForeignKey
ALTER TABLE "parts" DROP CONSTRAINT "parts_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "parts" DROP CONSTRAINT "parts_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_receivedById_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_quotation_items" DROP CONSTRAINT "pos_quotation_items_partId_fkey";

-- DropForeignKey
ALTER TABLE "pos_quotation_items" DROP CONSTRAINT "pos_quotation_items_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "pos_quotations" DROP CONSTRAINT "pos_quotations_createdById_fkey";

-- DropForeignKey
ALTER TABLE "pos_quotations" DROP CONSTRAINT "pos_quotations_customerId_fkey";

-- DropForeignKey
ALTER TABLE "pos_quotations" DROP CONSTRAINT "pos_quotations_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sale_items" DROP CONSTRAINT "pos_sale_items_partId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sale_items" DROP CONSTRAINT "pos_sale_items_saleId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sale_payments" DROP CONSTRAINT "pos_sale_payments_saleId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_cashRegisterId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_createdById_fkey";

-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_customerId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "pos_sales" DROP CONSTRAINT "pos_sales_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_partId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_createdById_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "technician_specializations" DROP CONSTRAINT "technician_specializations_userId_fkey";

-- DropForeignKey
ALTER TABLE "technician_unavailabilities" DROP CONSTRAINT "technician_unavailabilities_userId_fkey";

-- DropForeignKey
ALTER TABLE "template_default_parts" DROP CONSTRAINT "template_default_parts_partId_fkey";

-- DropForeignKey
ALTER TABLE "template_default_parts" DROP CONSTRAINT "template_default_parts_templateId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_settings" DROP CONSTRAINT "tenant_settings_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_notes" DROP CONSTRAINT "ticket_notes_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_notes" DROP CONSTRAINT "ticket_notes_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_sequences" DROP CONSTRAINT "ticket_sequences_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_services" DROP CONSTRAINT "ticket_services_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_services" DROP CONSTRAINT "ticket_services_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_createdById_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_customerId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_serviceTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_createdById_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_updatedById_fkey";

DROP INDEX "audit_logs_tenantId_idx";

ALTER TABLE "audit_logs"
    ALTER COLUMN "id" TYPE UUID USING "id"::uuid,
    ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::uuid,
    ALTER COLUMN "action" TYPE "AuditAction" USING (
        CASE
            WHEN "action" = 'TICKET_STATUS_CHANGE' THEN 'TICKET_STATUS_CHANGED'::"AuditAction"
            WHEN "action" = 'ADMIN_USER_AUTO_CREATED' THEN 'USER_CREATED'::"AuditAction"
            WHEN "action" LIKE 'DB\\_%' THEN 'CONFIG_CHANGED'::"AuditAction"
            WHEN "action" IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'ROLE_CHANGED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET', 'SESSION_EXPIRED', 'TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_DELETED', 'TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'PARTS_APPROVED', 'PARTS_REJECTED', 'CONFIG_CHANGED', 'TENANT_CONFIG_CHANGED', 'EXPORT_DATA', 'DATA_EXPORTED', 'MODULE_ACCESSED')
                THEN "action"::"AuditAction"
            ELSE 'CONFIG_CHANGED'::"AuditAction"
        END
    );

ALTER TABLE "audit_logs"
    ADD COLUMN IF NOT EXISTS "entityId" UUID,
    ADD COLUMN IF NOT EXISTS "entityType" TEXT,
    ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB,
    ADD COLUMN IF NOT EXISTS "module" "AuditModule" NOT NULL DEFAULT 'DASHBOARD',
    ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

ALTER TABLE "audit_logs" ALTER COLUMN "module" DROP DEFAULT;

ALTER TABLE "cash_registers"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "openedById" TYPE UUID USING "openedById"::UUID,
    ALTER COLUMN "closedById" TYPE UUID USING "closedById"::UUID;

ALTER TABLE "cash_transactions"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "cashRegisterId" TYPE UUID USING "cashRegisterId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID;

ALTER TABLE "credit_note_items"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "creditNoteId" TYPE UUID USING "creditNoteId"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID;

ALTER TABLE "credit_notes"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "posSaleId" TYPE UUID USING "posSaleId"::UUID,
    ALTER COLUMN "customerId" TYPE UUID USING "customerId"::UUID,
    ALTER COLUMN "processedById" TYPE UUID USING "processedById"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID;

ALTER TABLE "customers"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "invoice_history"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "invoiceId" TYPE UUID USING "invoiceId"::UUID,
    ALTER COLUMN "userId" TYPE UUID USING "userId"::UUID;

ALTER TABLE "invoices"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "ticketId" TYPE UUID USING "ticketId"::UUID,
    ALTER COLUMN "customerId" TYPE UUID USING "customerId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "notifications"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "userId" TYPE UUID USING "userId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID;

ALTER TABLE "part_usages"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "ticketId" TYPE UUID USING "ticketId"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID,
    ALTER COLUMN "approvedById" TYPE UUID USING "approvedById"::UUID;

ALTER TABLE "parts"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "payments"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "invoiceId" TYPE UUID USING "invoiceId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "receivedById" TYPE UUID USING "receivedById"::UUID;

ALTER TABLE "pos_quotation_items"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "quotationId" TYPE UUID USING "quotationId"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID;

ALTER TABLE "pos_quotations"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "customerId" TYPE UUID USING "customerId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID;

ALTER TABLE "pos_sale_items"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "saleId" TYPE UUID USING "saleId"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID;

ALTER TABLE "pos_sale_payments"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "saleId" TYPE UUID USING "saleId"::UUID;

ALTER TABLE "pos_sales"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "customerId" TYPE UUID USING "customerId"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "cashRegisterId" TYPE UUID USING "cashRegisterId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "quotationId" TYPE UUID USING "quotationId"::UUID;

ALTER TABLE "purchase_items"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID,
    ALTER COLUMN "purchaseOrderId" TYPE UUID USING "purchaseOrderId"::UUID;

ALTER TABLE "purchase_orders"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "service_templates"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "technician_specializations"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "userId" TYPE UUID USING "userId"::UUID;

ALTER TABLE "technician_unavailabilities"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "userId" TYPE UUID USING "userId"::UUID;

ALTER TABLE "template_default_parts"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "templateId" TYPE UUID USING "templateId"::UUID,
    ALTER COLUMN "partId" TYPE UUID USING "partId"::UUID;

ALTER TABLE "tenant_settings"
    ADD COLUMN     "slaCriticalPercent" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "slaEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slaInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slaWarningPercent" INTEGER NOT NULL DEFAULT 75,
ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID;

ALTER TABLE "tenants"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID;

ALTER TABLE "ticket_notes"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "ticketId" TYPE UUID USING "ticketId"::UUID,
    ALTER COLUMN "authorId" TYPE UUID USING "authorId"::UUID;

ALTER TABLE "ticket_sequences"
    ALTER COLUMN "tenant_id" TYPE UUID USING "tenant_id"::UUID;

ALTER TABLE "ticket_services"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "ticketId" TYPE UUID USING "ticketId"::UUID,
    ALTER COLUMN "serviceId" TYPE UUID USING "serviceId"::UUID;

ALTER TABLE "tickets"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "customerId" TYPE UUID USING "customerId"::UUID,
    ALTER COLUMN "assignedToId" TYPE UUID USING "assignedToId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "serviceTemplateId" TYPE UUID USING "serviceTemplateId"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

ALTER TABLE "users"
    ALTER COLUMN "id" TYPE UUID USING "id"::UUID,
    ALTER COLUMN "tenantId" TYPE UUID USING "tenantId"::UUID,
    ALTER COLUMN "createdById" TYPE UUID USING "createdById"::UUID,
    ALTER COLUMN "updatedById" TYPE UUID USING "updatedById"::UUID;

-- ==================================================================
-- Recreate DB functions / triggers for UUID types
-- ==================================================================

-- Drop legacy audit trigger (writes non-enum actions; conflicts with AuditAction)
DROP TRIGGER IF EXISTS trg_audit_parts ON parts;
DROP FUNCTION IF EXISTS audit_changes();

-- next_ticket_number now takes a UUID tenant id
CREATE OR REPLACE FUNCTION next_ticket_number(p_tenant_id UUID, p_year INTEGER)
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

CREATE OR REPLACE FUNCTION assign_ticket_number()
RETURNS TRIGGER AS $body$
DECLARE
    v_year INTEGER;
BEGIN
    IF NEW."ticketNumber" IS NULL OR NEW."ticketNumber" = '' THEN
        v_year := EXTRACT(YEAR FROM COALESCE(NEW."createdAt", NOW()))::INTEGER;
        NEW."ticketNumber" := next_ticket_number(NEW."tenantId", v_year);
    END IF;
    RETURN NEW;
END;
$body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_ticket_number ON tickets;
CREATE TRIGGER trg_assign_ticket_number
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION assign_ticket_number();

-- Ticket status audit: use valid enum action + module
CREATE OR REPLACE FUNCTION log_ticket_status_history()
RETURNS TRIGGER AS $body$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_logs (id, action, module, details, "userId", "tenantId", "createdAt")
        VALUES (
            gen_random_uuid(),
            'TICKET_STATUS_CHANGED',
            'TICKETS',
            jsonb_build_object(
                'ticketId', NEW.id,
                'oldStatus', OLD.status,
                'newStatus', NEW.status
            )::text,
            COALESCE(NEW."updatedById", NEW."createdById"),
            NEW."tenantId",
            now()
        );
    END IF;
    RETURN NEW;
END;
$body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_ticket_status_history ON tickets;
CREATE TRIGGER trg_log_ticket_status_history
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_status_history();

-- Recreated with uuid-aware types: users.id and audit_logs (id, userId,
-- tenantId, action) are now UUID/enum columns after the conversion.
CREATE OR REPLACE FUNCTION auto_create_admin_user()
RETURNS TRIGGER AS $body$
DECLARE
    temp_password TEXT;
    admin_email TEXT;
    new_user_id UUID;
BEGIN
    temp_password := 'TempPass_' || substring(md5(random()::text) from 1 for 8) || '!';
    admin_email := 'admin@' || NEW.slug || '.local';
    new_user_id := gen_random_uuid();

    INSERT INTO "users" (
        "id", "email", "password", "firstName", "lastName", "name", "role",
        "tenantId", "isActive", "passwordMustChange", "createdAt", "updatedAt"
    ) VALUES (
        new_user_id,
        admin_email,
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4OqnL8lX8GqHUlHm',
        'Admin',
        NEW.name,
        'Admin ' || NEW.name,
        'ADMIN',
        NEW.id,
        true,
        true,
        NOW(),
        NOW()
    );

    UPDATE "tenants" SET "adminUserId" = new_user_id::text WHERE "id" = NEW.id;

    INSERT INTO "audit_logs" (
        "id", "action", "module", "details", "userId", "tenantId", "createdAt"
    ) VALUES (
        gen_random_uuid(),
        'USER_CREATED'::"AuditAction",
        'USERS'::"AuditModule",
        jsonb_build_object(
            'message', 'Admin user auto-created for new tenant',
            'adminEmail', admin_email,
            'tenantName', NEW.name,
            'passwordMustChange', true
        )::text,
        new_user_id,
        NEW.id,
        NOW()
    );

    RETURN NEW;
END;
$body$ LANGUAGE plpgsql;
-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,

    CONSTRAINT "session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'ONLINE',
    "currentRoute" TEXT,
    "currentPage" TEXT,
    "currentTicketId" UUID,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_attachments_ticketId_idx" ON "ticket_attachments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "session_logs_sessionToken_key" ON "session_logs"("sessionToken");

-- CreateIndex
CREATE INDEX "session_logs_tenantId_status_idx" ON "session_logs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "session_logs_userId_loginAt_idx" ON "session_logs"("userId", "loginAt");

-- CreateIndex
CREATE INDEX "session_logs_sessionToken_idx" ON "session_logs"("sessionToken");

-- CreateIndex
CREATE INDEX "session_logs_lastActivityAt_idx" ON "session_logs"("lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_presence_userId_key" ON "user_presence"("userId");

-- CreateIndex
CREATE INDEX "user_presence_tenantId_lastSeenAt_idx" ON "user_presence"("tenantId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "user_presence_tenantId_status_idx" ON "user_presence"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_presence_currentTicketId_idx" ON "user_presence"("currentTicketId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_module_createdAt_idx" ON "audit_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_success_idx" ON "audit_logs"("tenantId", "success");

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_sequences" ADD CONSTRAINT "ticket_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usages" ADD CONSTRAINT "part_usages_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usages" ADD CONSTRAINT "part_usages_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_usages" ADD CONSTRAINT "part_usages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_default_parts" ADD CONSTRAINT "template_default_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_default_parts" ADD CONSTRAINT "template_default_parts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_services" ADD CONSTRAINT "ticket_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_services" ADD CONSTRAINT "ticket_services_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_specializations" ADD CONSTRAINT "technician_specializations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_unavailabilities" ADD CONSTRAINT "technician_unavailabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_history" ADD CONSTRAINT "invoice_history_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_history" ADD CONSTRAINT "invoice_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "pos_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_payments" ADD CONSTRAINT "pos_sale_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_quotations" ADD CONSTRAINT "pos_quotations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_quotations" ADD CONSTRAINT "pos_quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_quotations" ADD CONSTRAINT "pos_quotations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_quotation_items" ADD CONSTRAINT "pos_quotation_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_quotation_items" ADD CONSTRAINT "pos_quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "pos_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "pos_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_items" ADD CONSTRAINT "credit_note_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_currentTicketId_fkey" FOREIGN KEY ("currentTicketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex

-- ==================================================================
-- Recreate user_management_view (dropped at the top so users.role
-- could change type; recreated now that all columns are UUID)
-- ==================================================================
CREATE OR REPLACE VIEW "user_management_view" AS
SELECT
  u."id",
  u."email",
  u."firstName",
  u."lastName",
  COALESCE(u."name", CONCAT(u."firstName", ' ', u."lastName")) as "displayName",
  u."role",
  u."tenantId",
  t."name" as "tenantName",
  u."isActive",
  u."passwordMustChange",
  u."lastLoginAt",
  u."failedLoginAttempts",
  u."lockedUntil",
  CASE
    WHEN u."lockedUntil" IS NOT NULL AND u."lockedUntil" > NOW() THEN true
    ELSE false
  END as "isLocked",
  u."createdAt",
  u."updatedAt",
  creator."email" as "createdByEmail",
  updater."email" as "updatedByEmail"
FROM "users" u
LEFT JOIN "tenants" t ON u."tenantId" = t."id"
LEFT JOIN "users" creator ON u."createdById" = creator."id"
LEFT JOIN "users" updater ON u."updatedById" = updater."id";

GRANT SELECT ON "user_management_view" TO PUBLIC;

-- Recreate RLS policies (mirror of 20260806184730_postgres_rls_policies)
DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'users', 'customers', 'tickets', 'ticket_attachments', 'parts',
        'purchase_orders', 'purchase_items', 'audit_logs', 'ticket_notes',
        'service_templates', 'template_default_parts', 'ticket_services',
        'technician_specializations', 'technician_unavailabilities',
        'notifications', 'invoices', 'payments', 'cash_registers',
        'cash_transactions', 'tenant_settings', 'invoice_history',
        'pos_sales', 'pos_sale_items', 'pos_sale_payments', 'pos_quotations',
        'pos_quotation_items', 'credit_notes', 'credit_note_items',
        'session_logs', 'user_presence'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = t_name AND column_name = 'tenantId'
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t_name);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t_name);
            EXECUTE format('
                CREATE POLICY tenant_isolation_policy ON %I
                FOR ALL
                USING (
                    "tenantId"::text = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::text
                    OR current_setting(''app.bypass_rls'', true) = ''on''
                );
            ', t_name);
        END IF;
    END LOOP;
END $$;
