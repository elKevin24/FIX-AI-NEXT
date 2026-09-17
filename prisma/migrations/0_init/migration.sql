-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'WAITING_APPROVAL', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('MAINTENANCE', 'REPAIR', 'UPGRADE', 'DIAGNOSTIC', 'INSTALLATION', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TechnicianStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ON_VACATION', 'ON_LEAVE', 'IN_TRAINING', 'SICK_LEAVE');

-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('LAPTOPS', 'DESKTOPS', 'PRINTERS', 'NETWORKING', 'MOBILE_DEVICES', 'SERVERS', 'PERIPHERALS', 'SOFTWARE', 'GENERAL');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "POSSaleStatus" AS ENUM ('COMPLETED', 'VOIDED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('PENDING', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'ROLE_CHANGED', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET', 'SESSION_EXPIRED', 'TICKET_CREATED', 'TICKET_UPDATED', 'TICKET_DELETED', 'TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'PARTS_APPROVED', 'PARTS_REJECTED', 'CONFIG_CHANGED', 'TENANT_CONFIG_CHANGED', 'EXPORT_DATA', 'DATA_EXPORTED', 'MODULE_ACCESSED');

-- CreateEnum
CREATE TYPE "AuditModule" AS ENUM ('AUTH', 'USERS', 'TICKETS', 'SETTINGS', 'REPORTS', 'DASHBOARD', 'INVENTORY', 'POS', 'BILLING');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'LOGGED_OUT');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "tenantId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordMustChange" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "TechnicianStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxConcurrentTickets" INTEGER NOT NULL DEFAULT 5,
    "statusReason" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "dpi" TEXT,
    "nit" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticketNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "tenantId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "assignedToId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessories" TEXT,
    "cancellationReason" TEXT,
    "checkInNotes" TEXT,
    "deviceModel" TEXT,
    "deviceType" TEXT DEFAULT 'PC',
    "serialNumber" TEXT,
    "createdById" UUID,
    "serviceTemplateId" UUID,
    "updatedById" UUID,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_sequences" (
    "tenant_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ticket_sequences_pkey" PRIMARY KEY ("tenant_id","year")
);

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
CREATE TABLE "parts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "category" TEXT,
    "location" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "supplier" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedDate" TIMESTAMP(3),
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tenantId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "partId" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_usages" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMPTZ,
    "approvedById" UUID,
    "priceAtProposal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ticketId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "details" TEXT,
    "userId" UUID,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "module" "AuditModule" NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_notes" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "defaultTitle" TEXT NOT NULL,
    "defaultDescription" TEXT NOT NULL,
    "defaultPriority" TEXT NOT NULL DEFAULT 'Medium',
    "estimatedDuration" INTEGER,
    "laborCost" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT DEFAULT '🔧',
    "tenantId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_default_parts" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "templateId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_default_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_services" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "laborCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_specializations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "specialization" "Specialization" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_unavailabilities" (
    "id" UUID NOT NULL,
    "reason" "TechnicianStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "notes" TEXT,
    "userId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_unavailabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "ticketId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "laborCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "partsCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "partsMarkup" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "customerName" TEXT NOT NULL,
    "customerNIT" TEXT,
    "customerDPI" TEXT,
    "customerAddress" TEXT,
    "notes" TEXT,
    "paymentTerms" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "tenantId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionRef" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" UUID NOT NULL,
    "receivedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "openingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expectedBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "difference" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingNotes" TEXT,
    "tenantId" UUID NOT NULL,
    "openedById" UUID,
    "closedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "cashRegisterId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "businessName" TEXT,
    "businessNIT" TEXT,
    "businessAddress" TEXT,
    "businessPhone" TEXT,
    "businessEmail" TEXT,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "taxName" TEXT NOT NULL DEFAULT 'IVA',
    "currency" TEXT NOT NULL DEFAULT 'GTQ',
    "defaultPaymentTerms" TEXT,
    "invoiceFooter" TEXT,
    "slaWarningPercent" INTEGER NOT NULL DEFAULT 75,
    "slaCriticalPercent" INTEGER NOT NULL DEFAULT 90,
    "slaEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slaInAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_history" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "notes" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sales" (
    "id" UUID NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "customerId" UUID,
    "customerName" TEXT NOT NULL DEFAULT 'Consumidor Final',
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "changeGiven" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "POSSaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "tenantId" UUID NOT NULL,
    "cashRegisterId" UUID,
    "createdById" UUID NOT NULL,
    "quotationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sale_items" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "pos_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sale_payments" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_quotations" (
    "id" UUID NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "customerId" UUID,
    "customerName" TEXT NOT NULL DEFAULT 'Consumidor Final',
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_quotation_items" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "pos_quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" UUID NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "posSaleId" UUID NOT NULL,
    "customerId" UUID,
    "reason" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'PENDING',
    "refundMethod" "PaymentMethod",
    "refundReference" TEXT,
    "notes" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" UUID,
    "tenantId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_items" (
    "id" UUID NOT NULL,
    "creditNoteId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "credit_note_items_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_adminUserId_idx" ON "tenants"("adminUserId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdById_idx" ON "users"("createdById");

-- CreateIndex
CREATE INDEX "users_updatedById_idx" ON "users"("updatedById");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "customers_createdById_idx" ON "customers"("createdById");

-- CreateIndex
CREATE INDEX "customers_updatedById_idx" ON "customers"("updatedById");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_dpi_tenantId_key" ON "customers"("dpi", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_nit_tenantId_key" ON "customers"("nit", "tenantId");

-- CreateIndex
CREATE INDEX "tickets_status_priority_idx" ON "tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "tickets_assignedToId_status_idx" ON "tickets"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "tickets_serviceTemplateId_idx" ON "tickets"("serviceTemplateId");

-- CreateIndex
CREATE INDEX "tickets_createdById_idx" ON "tickets"("createdById");

-- CreateIndex
CREATE INDEX "tickets_updatedById_idx" ON "tickets"("updatedById");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_tenantId_key" ON "tickets"("ticketNumber", "tenantId");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticketId_idx" ON "ticket_attachments"("ticketId");

-- CreateIndex
CREATE INDEX "parts_createdById_idx" ON "parts"("createdById");

-- CreateIndex
CREATE INDEX "parts_updatedById_idx" ON "parts"("updatedById");

-- CreateIndex
CREATE INDEX "parts_tenantId_idx" ON "parts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "parts_sku_tenantId_key" ON "parts"("sku", "tenantId");

-- CreateIndex
CREATE INDEX "purchase_orders_tenantId_idx" ON "purchase_orders"("tenantId");

-- CreateIndex
CREATE INDEX "part_usages_approved_idx" ON "part_usages"("approved");

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
CREATE INDEX "service_templates_tenantId_idx" ON "service_templates"("tenantId");

-- CreateIndex
CREATE INDEX "service_templates_tenantId_category_idx" ON "service_templates"("tenantId", "category");

-- CreateIndex
CREATE INDEX "service_templates_tenantId_isActive_idx" ON "service_templates"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "service_templates_createdById_idx" ON "service_templates"("createdById");

-- CreateIndex
CREATE INDEX "service_templates_updatedById_idx" ON "service_templates"("updatedById");

-- CreateIndex
CREATE INDEX "template_default_parts_templateId_idx" ON "template_default_parts"("templateId");

-- CreateIndex
CREATE INDEX "template_default_parts_partId_idx" ON "template_default_parts"("partId");

-- CreateIndex
CREATE INDEX "ticket_services_ticketId_idx" ON "ticket_services"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_services_serviceId_idx" ON "ticket_services"("serviceId");

-- CreateIndex
CREATE INDEX "technician_specializations_userId_idx" ON "technician_specializations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "technician_specializations_userId_specialization_key" ON "technician_specializations"("userId", "specialization");

-- CreateIndex
CREATE INDEX "technician_unavailabilities_userId_idx" ON "technician_unavailabilities"("userId");

-- CreateIndex
CREATE INDEX "technician_unavailabilities_userId_isActive_idx" ON "technician_unavailabilities"("userId", "isActive");

-- CreateIndex
CREATE INDEX "technician_unavailabilities_startDate_endDate_idx" ON "technician_unavailabilities"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_ticketId_key" ON "invoices"("ticketId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_ticketId_idx" ON "invoices"("ticketId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issuedAt_idx" ON "invoices"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_tenantId_key" ON "invoices"("invoiceNumber", "tenantId");

-- CreateIndex
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentNumber_tenantId_key" ON "payments"("paymentNumber", "tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_idx" ON "cash_registers"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_isOpen_idx" ON "cash_registers"("isOpen");

-- CreateIndex
CREATE INDEX "cash_registers_openedAt_idx" ON "cash_registers"("openedAt");

-- CreateIndex
CREATE INDEX "cash_transactions_tenantId_idx" ON "cash_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "cash_transactions_cashRegisterId_idx" ON "cash_transactions"("cashRegisterId");

-- CreateIndex
CREATE INDEX "cash_transactions_createdAt_idx" ON "cash_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_history_invoiceId_idx" ON "invoice_history"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_quotationId_key" ON "pos_sales"("quotationId");

-- CreateIndex
CREATE INDEX "pos_sales_tenantId_createdAt_idx" ON "pos_sales"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "pos_sales_status_idx" ON "pos_sales"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_saleNumber_tenantId_key" ON "pos_sales"("saleNumber", "tenantId");

-- CreateIndex
CREATE INDEX "pos_quotations_tenantId_createdAt_idx" ON "pos_quotations"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "pos_quotations_status_idx" ON "pos_quotations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_quotations_quotationNumber_tenantId_key" ON "pos_quotations"("quotationNumber", "tenantId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_createdAt_idx" ON "credit_notes"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_notes_status_idx" ON "credit_notes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_creditNoteNumber_tenantId_key" ON "credit_notes"("creditNoteNumber", "tenantId");

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
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_email_token_key" ON "PasswordResetToken"("email", "token");

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

-- ==============================================================================
-- FIX-AI-NEXT — Extensions, Custom Indexes, Functions, Triggers, Views & RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- ==============================================================================
-- 1. Custom Indexes
-- ==============================================================================

-- Unique Partial Index for Singleton Super Admin
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_singleton_super_admin" ON "users"("role") WHERE "role" = 'SUPER_ADMIN';

-- GIN Trigram Indexes for Fuzzy Search
CREATE INDEX IF NOT EXISTS "idx_customers_name_trgm" ON "customers" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_customers_email_trgm" ON "customers" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_customers_phone_trgm" ON "customers" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_customers_nit_trgm" ON "customers" USING GIN ("nit" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_tickets_title_trgm" ON "tickets" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_tickets_desc_trgm" ON "tickets" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_tickets_number_trgm" ON "tickets" USING GIN ("ticketNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_tickets_serial_trgm" ON "tickets" USING GIN ("serialNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_parts_name_trgm" ON "parts" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_parts_sku_trgm" ON "parts" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_parts_desc_trgm" ON "parts" USING GIN ("description" gin_trgm_ops);

-- ==============================================================================
-- 2. Helper Functions
-- ==============================================================================

CREATE OR REPLACE FUNCTION uuidv7()
RETURNS uuid AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_ticket_number(p_tenant_id UUID, p_year INTEGER)
RETURNS VARCHAR(20) AS $$
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
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Trigger Functions and Triggers
-- ==============================================================================

-- 3.1 Tickets: Auto-assign ticket number
CREATE OR REPLACE FUNCTION trg_assign_ticket_number()
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

DROP TRIGGER IF EXISTS assign_ticket_number_trigger ON tickets;
CREATE TRIGGER assign_ticket_number_trigger
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION trg_assign_ticket_number();

-- 3.2 Tenants: Auto-create admin user on tenant creation
CREATE OR REPLACE FUNCTION auto_create_admin_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_email TEXT;
    new_user_id UUID;
BEGIN
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_admin_user ON tenants;
CREATE TRIGGER trigger_auto_create_admin_user
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION auto_create_admin_user();

-- 3.3 Tickets: Status change audit
CREATE OR REPLACE FUNCTION log_ticket_status_history()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_ticket_status_history ON tickets;
CREATE TRIGGER trg_log_ticket_status_history
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION log_ticket_status_history();

-- 3.4 Part Usages: Atomic inventory synchronization with approval
CREATE OR REPLACE FUNCTION trg_sync_part_inventory()
RETURNS TRIGGER AS $$
DECLARE
    part_name   TEXT;
    current_qty INT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.approved THEN
            SELECT name, quantity INTO part_name, current_qty
            FROM parts WHERE id = NEW."partId";

            UPDATE parts
            SET quantity = quantity - NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId"
              AND quantity >= NEW.quantity;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para "%" (ID %). Disponible: %, Solicitado: %',
                    COALESCE(part_name, 'repuesto'), NEW."partId", COALESCE(current_qty, 0), NEW.quantity;
            END IF;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF NOT OLD.approved AND NEW.approved THEN
            SELECT name, quantity INTO part_name, current_qty
            FROM parts WHERE id = NEW."partId";

            UPDATE parts
            SET quantity = quantity - NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId"
              AND quantity >= NEW.quantity;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Stock insuficiente para "%" (ID %). Disponible: %, Solicitado: %',
                    COALESCE(part_name, 'repuesto'), NEW."partId", COALESCE(current_qty, 0), NEW.quantity;
            END IF;

        ELSIF OLD.approved AND NOT NEW.approved THEN
            UPDATE parts
            SET quantity = quantity + NEW.quantity,
                "updatedAt" = NOW()
            WHERE id = NEW."partId";
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.approved THEN
            UPDATE parts
            SET quantity = quantity + OLD.quantity,
                "updatedAt" = NOW()
            WHERE id = OLD."partId";
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_part_inventory_trigger ON part_usages;
CREATE TRIGGER sync_part_inventory_trigger
AFTER INSERT OR UPDATE OR DELETE ON part_usages
FOR EACH ROW EXECUTE FUNCTION trg_sync_part_inventory();

-- 3.5 Cash Transactions: Cash register expected balance synchronization
CREATE OR REPLACE FUNCTION sync_cash_register_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + NEW.amount WHERE id = NEW."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - NEW.amount WHERE id = NEW."cashRegisterId";
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - OLD.amount WHERE id = OLD."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + OLD.amount WHERE id = OLD."cashRegisterId";
        END IF;
        IF (NEW.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + NEW.amount WHERE id = NEW."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - NEW.amount WHERE id = NEW."cashRegisterId";
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'INCOME') THEN
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" - OLD.amount WHERE id = OLD."cashRegisterId";
        ELSE
            UPDATE cash_registers SET "expectedBalance" = "expectedBalance" + OLD.amount WHERE id = OLD."cashRegisterId";
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cash_register_balance ON cash_transactions;
CREATE TRIGGER trg_sync_cash_register_balance
AFTER INSERT OR UPDATE OR DELETE ON cash_transactions
FOR EACH ROW EXECUTE FUNCTION sync_cash_register_balance();

-- 3.6 POS: Prevent negative stock on sale items
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT quantity INTO current_stock FROM parts WHERE id = NEW."partId";
    
    IF current_stock IS NULL THEN
        RETURN NEW;
    END IF;

    IF (current_stock - NEW.quantity) < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para la parte % (Actual: %, Solicitado: %)', 
            NEW."partId", current_stock, NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock_pos ON pos_sale_items;
CREATE TRIGGER trg_prevent_negative_stock_pos
BEFORE INSERT OR UPDATE ON pos_sale_items
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- 3.7 POS: Decrement / Restore stock on POS sale item
CREATE OR REPLACE FUNCTION update_stock_on_pos_sale_item()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE parts SET quantity = quantity - NEW.quantity WHERE id = NEW."partId";
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE parts SET quantity = quantity + OLD.quantity WHERE id = OLD."partId";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_pos_item ON pos_sale_items;
CREATE TRIGGER trg_update_stock_on_pos_item
AFTER INSERT OR DELETE ON pos_sale_items
FOR EACH ROW EXECUTE FUNCTION update_stock_on_pos_sale_item();

-- 3.8 POS: Auto-assign sale number sequence
CREATE OR REPLACE FUNCTION assign_sale_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW."saleNumber" IS NULL OR NEW."saleNumber" = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING("saleNumber" FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO next_num
        FROM pos_sales 
        WHERE "tenantId" = NEW."tenantId"
        AND "saleNumber" ~ '^S-\d+$'; 

        NEW."saleNumber" := 'S-' || next_num;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_sale_number ON pos_sales;
CREATE TRIGGER trg_assign_sale_number
BEFORE INSERT ON pos_sales
FOR EACH ROW EXECUTE FUNCTION assign_sale_number();

-- 3.9 POS: Restore stock on sale void
CREATE OR REPLACE FUNCTION restore_stock_on_pos_void()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF (OLD.status != 'VOIDED' AND NEW.status = 'VOIDED') THEN
        FOR item IN SELECT * FROM pos_sale_items WHERE "saleId" = NEW.id LOOP
            UPDATE parts 
            SET quantity = quantity + item.quantity 
            WHERE id = item."partId";
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_stock_on_void ON pos_sales;
CREATE TRIGGER trg_restore_stock_on_void
AFTER UPDATE ON pos_sales
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_pos_void();

-- ==============================================================================
-- 4. Views
-- ==============================================================================

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

-- ==============================================================================
-- 5. Row Level Security (RLS) Tenant Isolation Policies
-- ==============================================================================

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
