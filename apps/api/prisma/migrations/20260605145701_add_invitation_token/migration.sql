-- AlterTable
ALTER TABLE "invitations" ADD COLUMN "token" TEXT NOT NULL DEFAULT '';

-- Backfill: set unique token for any existing rows (dev data only)
UPDATE "invitations" SET "token" = gen_random_uuid()::text WHERE "token" = '';

-- Remove default (token must be supplied by application going forward)
ALTER TABLE "invitations" ALTER COLUMN "token" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
