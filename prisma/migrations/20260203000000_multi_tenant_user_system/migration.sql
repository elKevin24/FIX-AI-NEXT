-- Multi-tenant User System Migration
-- This migration adds:
-- 1. New user fields for multi-tenant management
-- 2. Updated UserRole enum with MANAGER, AGENT, VIEWER
-- 3. Trigger for auto-creating admin user on tenant creation

-- ==================================================================
-- STEP 1: Add new columns to users table
-- ==================================================================

-- Add new columns if they don't exist
DO $$
BEGIN
  -- firstName
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'firstName') THEN
    ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
  END IF;

  -- lastName
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastName') THEN
    ALTER TABLE "users" ADD COLUMN "lastName" TEXT;
  END IF;

  -- isActive
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isActive') THEN
    ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- passwordMustChange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordMustChange') THEN
    ALTER TABLE "users" ADD COLUMN "passwordMustChange" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- lastLoginAt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastLoginAt') THEN
    ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
  END IF;

  -- failedLoginAttempts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failedLoginAttempts') THEN
    ALTER TABLE "users" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- lockedUntil
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lockedUntil') THEN
    ALTER TABLE "users" ADD COLUMN "lockedUntil" TIMESTAMP(3);
  END IF;

  -- createdById
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdById') THEN
    ALTER TABLE "users" ADD COLUMN "createdById" TEXT;
  END IF;

  -- updatedById
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedById') THEN
    ALTER TABLE "users" ADD COLUMN "updatedById" TEXT;
  END IF;
END $$;

-- ==================================================================
-- STEP 2: Add adminUserId to tenants table
-- ==================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'adminUserId') THEN
    ALTER TABLE "tenants" ADD COLUMN "adminUserId" TEXT;
  END IF;
END $$;

-- ==================================================================
-- STEP 3: Update UserRole enum with new values
-- ==================================================================

-- Add new enum values if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AGENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'AGENT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIEWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'VIEWER';
  END IF;
END $$;

-- ==================================================================
-- STEP 4: Drop old unique constraint on email and add compound unique
-- ==================================================================

-- Drop old unique constraint if exists
DROP INDEX IF EXISTS "users_email_key";

-- Create compound unique index on (tenantId, email)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_email_per_tenant" ON "users"("tenantId", "email");

-- ==================================================================
-- STEP 5: Add indexes for performance
-- ==================================================================

CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX IF NOT EXISTS "users_createdById_idx" ON "users"("createdById");
CREATE INDEX IF NOT EXISTS "users_updatedById_idx" ON "users"("updatedById");
CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "tenants_adminUserId_idx" ON "tenants"("adminUserId");

-- ==================================================================
-- STEP 6: Add foreign key constraints for user audit trail
-- ==================================================================

DO $$
BEGIN
  -- Add FK for createdById if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_createdById_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Add FK for updatedById if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_updatedById_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ==================================================================
-- STEP 7: Migrate existing name field to firstName + lastName
-- ==================================================================

-- Split existing name into firstName and lastName where possible
UPDATE "users"
SET
  "firstName" = CASE
    WHEN "name" IS NOT NULL AND position(' ' in "name") > 0
    THEN split_part("name", ' ', 1)
    ELSE "name"
  END,
  "lastName" = CASE
    WHEN "name" IS NOT NULL AND position(' ' in "name") > 0
    THEN substring("name" from position(' ' in "name") + 1)
    ELSE NULL
  END
WHERE "firstName" IS NULL AND "name" IS NOT NULL;

-- ==================================================================
-- STEP 8: Create function and trigger for auto-creating admin on tenant creation
-- ==================================================================

-- Function to auto-create admin user when tenant is created
CREATE OR REPLACE FUNCTION auto_create_admin_user()
RETURNS TRIGGER AS $$
DECLARE
  temp_password TEXT;
  admin_email TEXT;
  new_user_id TEXT;
BEGIN
  -- Generate a temporary password (will be hashed externally and must be changed)
  -- Format: TempPass_<random_8_chars>!
  temp_password := 'TempPass_' || substring(md5(random()::text) from 1 for 8) || '!';

  -- Generate admin email based on tenant slug
  admin_email := 'admin@' || NEW.slug || '.local';

  -- Generate UUID for new user
  new_user_id := gen_random_uuid()::text;

  -- Create the admin user with temporary password
  -- NOTE: Password is stored as bcrypt hash placeholder - actual hashing must be done at application level
  -- The passwordMustChange flag ensures user must change password on first login
  INSERT INTO "users" (
    "id",
    "email",
    "password",
    "firstName",
    "lastName",
    "name",
    "role",
    "tenantId",
    "isActive",
    "passwordMustChange",
    "createdAt",
    "updatedAt"
  ) VALUES (
    new_user_id,
    admin_email,
    -- Placeholder hash - should be updated immediately after tenant creation
    -- This is a bcrypt hash of 'ChangeMe123!' for initial setup only
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4OqnL8lX8GqHUlHm',
    'Admin',
    NEW.name,
    'Admin ' || NEW.name,
    'ADMIN',
    NEW.id,
    true,
    true,  -- Force password change on first login
    NOW(),
    NOW()
  );

  -- Update tenant with admin user reference
  UPDATE "tenants" SET "adminUserId" = new_user_id WHERE "id" = NEW.id;

  -- Log the creation in audit_logs
  INSERT INTO "audit_logs" (
    "id",
    "action",
    "details",
    "userId",
    "tenantId",
    "createdAt"
  ) VALUES (
    gen_random_uuid()::text,
    'ADMIN_USER_AUTO_CREATED',
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_create_admin_user ON "tenants";

-- Create trigger to auto-create admin user after tenant insert
CREATE TRIGGER trigger_auto_create_admin_user
  AFTER INSERT ON "tenants"
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_admin_user();

-- ==================================================================
-- STEP 9: Create function for tracking failed login attempts
-- ==================================================================

CREATE OR REPLACE FUNCTION track_failed_login(user_email TEXT, user_tenant_id TEXT)
RETURNS TABLE(
  is_locked BOOLEAN,
  attempts_remaining INTEGER,
  locked_until TIMESTAMP
) AS $$
DECLARE
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
  current_attempts INTEGER;
  current_locked_until TIMESTAMP;
BEGIN
  -- Get current state
  SELECT u."failedLoginAttempts", u."lockedUntil"
  INTO current_attempts, current_locked_until
  FROM "users" u
  WHERE u."email" = user_email AND u."tenantId" = user_tenant_id;

  -- Check if already locked
  IF current_locked_until IS NOT NULL AND current_locked_until > NOW() THEN
    RETURN QUERY SELECT true, 0, current_locked_until;
    RETURN;
  END IF;

  -- Increment failed attempts
  current_attempts := COALESCE(current_attempts, 0) + 1;

  -- Check if should lock
  IF current_attempts >= max_attempts THEN
    UPDATE "users"
    SET
      "failedLoginAttempts" = current_attempts,
      "lockedUntil" = NOW() + lockout_duration
    WHERE "email" = user_email AND "tenantId" = user_tenant_id;

    RETURN QUERY SELECT true, 0, (NOW() + lockout_duration)::TIMESTAMP;
  ELSE
    UPDATE "users"
    SET "failedLoginAttempts" = current_attempts
    WHERE "email" = user_email AND "tenantId" = user_tenant_id;

    RETURN QUERY SELECT false, max_attempts - current_attempts, NULL::TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- STEP 10: Create function to reset login attempts on successful login
-- ==================================================================

CREATE OR REPLACE FUNCTION reset_login_attempts(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE "users"
  SET
    "failedLoginAttempts" = 0,
    "lockedUntil" = NULL,
    "lastLoginAt" = NOW()
  WHERE "id" = user_id;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- STEP 11: Create view for user management with computed fields
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

-- Grant permissions on the view
GRANT SELECT ON "user_management_view" TO PUBLIC;

-- ==================================================================
-- MIGRATION COMPLETE
-- ==================================================================

COMMENT ON FUNCTION auto_create_admin_user() IS
'Automatically creates an admin user when a new tenant is created.
The admin user has passwordMustChange=true to force password update on first login.';

COMMENT ON FUNCTION track_failed_login(TEXT, TEXT) IS
'Tracks failed login attempts and locks user account after 5 failed attempts for 15 minutes.';

COMMENT ON FUNCTION reset_login_attempts(TEXT) IS
'Resets failed login attempts counter and updates lastLoginAt on successful login.';
