-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "approvalToken" TEXT;
ALTER TABLE "tickets" ADD COLUMN "approvalTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_approvalToken_key" ON "tickets"("approvalToken");