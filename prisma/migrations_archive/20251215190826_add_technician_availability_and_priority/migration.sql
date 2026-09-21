-- CreateEnum (only if not exists)
DO $$ BEGIN
 CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "TechnicianStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ON_VACATION', 'ON_LEAVE', 'IN_TRAINING', 'SICK_LEAVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "Specialization" AS ENUM ('LAPTOPS', 'DESKTOPS', 'PRINTERS', 'NETWORKING', 'MOBILE_DEVICES', 'SERVERS', 'PERIPHERALS', 'SOFTWARE', 'GENERAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable User: Add technician-specific fields
ALTER TABLE "users" ADD COLUMN "status" "TechnicianStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN "maxConcurrentTickets" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "availableFrom" TIMESTAMP(3),
ADD COLUMN "availableUntil" TIMESTAMP(3);

-- AlterTable Ticket: Migrate priority from String to Enum
-- Step 1: Add temporary column
ALTER TABLE "tickets" ADD COLUMN "priority_new" "TicketPriority" NOT NULL DEFAULT 'MEDIUM';

-- Step 2: Migrate existing data
UPDATE "tickets" SET "priority_new" =
  CASE
    WHEN UPPER(COALESCE(priority, 'MEDIUM')) = 'LOW' THEN 'LOW'::"TicketPriority"
    WHEN UPPER(COALESCE(priority, 'MEDIUM')) IN ('MEDIUM', 'NORMAL') THEN 'MEDIUM'::"TicketPriority"
    WHEN UPPER(COALESCE(priority, 'MEDIUM')) = 'HIGH' THEN 'HIGH'::"TicketPriority"
    WHEN UPPER(COALESCE(priority, 'MEDIUM')) = 'URGENT' THEN 'URGENT'::"TicketPriority"
    ELSE 'MEDIUM'::"TicketPriority"
  END;

-- Step 3: Drop old column and rename new one
ALTER TABLE "tickets" DROP COLUMN "priority";
ALTER TABLE "tickets" RENAME COLUMN "priority_new" TO "priority";

-- CreateTable: TechnicianSpecialization
CREATE TABLE "technician_specializations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialization" "Specialization" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TechnicianUnavailability
CREATE TABLE "technician_unavailabilities" (
    "id" TEXT NOT NULL,
    "reason" "TechnicianStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_unavailabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_status_priority_idx" ON "tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "tickets_assignedToId_status_idx" ON "tickets"("assignedToId", "status");

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

-- AddForeignKey
ALTER TABLE "technician_specializations" ADD CONSTRAINT "technician_specializations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_unavailabilities" ADD CONSTRAINT "technician_unavailabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
