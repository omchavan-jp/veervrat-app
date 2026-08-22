-- Age gate, consent records, and the pending-signup handoff.
--
-- ⚠️ THIS MIGRATION DELETES USER ROWS. Read the guard below before running it anywhere.
--
-- `dob` becomes required. Existing rows may hold NULL — in this project those are end-to-end
-- test fixtures and accounts created while the field was optional. The decision
-- (spec/decisions/21_age-and-personal-attributes.md) is to delete rather than backfill: a
-- default date would be a fabricated answer to "is this person over 18", which is exactly the
-- question the column exists to answer.
--
-- The guard exists because that decision is only safe while the data is disposable. If this ever
-- runs against a database with a real user population, it must fail rather than quietly delete
-- accounts. Fifty is a deliberate threshold: comfortably above any fixture set, far below a real
-- user base.
DO $$
DECLARE
  null_dob_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_dob_count FROM "users" WHERE "dob" IS NULL;

  IF null_dob_count > 50 THEN
    RAISE EXCEPTION
      'Refusing to run: % users have no date of birth. This migration deletes them, which is '
      'only acceptable for a disposable dataset. Decide deliberately before proceeding — see '
      'spec/decisions/21_age-and-personal-attributes.md.', null_dob_count;
  END IF;

  IF null_dob_count > 0 THEN
    RAISE NOTICE 'Deleting % user(s) with no date of birth.', null_dob_count;
    DELETE FROM "users" WHERE "dob" IS NULL;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "cms_pages" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "dob" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_signups" (
    "id" UUID NOT NULL,
    "dob" DATE NOT NULL,
    "consents" JSONB NOT NULL,
    "language" "language" NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_document_key_version_key" ON "user_consents"("user_id", "document_key", "version");

-- CreateIndex
CREATE INDEX "pending_signups_expires_at_idx" ON "pending_signups"("expires_at");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
