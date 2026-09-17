-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "accessories" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "checkInNotes" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "deviceType" TEXT DEFAULT 'PC',
ADD COLUMN     "serialNumber" TEXT;
