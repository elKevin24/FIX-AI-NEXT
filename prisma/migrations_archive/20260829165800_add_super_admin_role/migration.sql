-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- Create Unique Partial Index for Singleton Super Admin
CREATE UNIQUE INDEX IF NOT EXISTS "unique_singleton_super_admin" ON "users"("role") WHERE "role" = 'SUPER_ADMIN';
