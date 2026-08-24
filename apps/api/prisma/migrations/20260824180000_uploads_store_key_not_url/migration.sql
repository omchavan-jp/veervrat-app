-- Store the storage key, not an absolute URL (#178).
--
-- The column held a full URL — and was named `minio_url` while both deployed environments run
-- Azure Blob. A URL encodes the visibility policy in force when it was written: change the
-- policy and every stored row is wrong. A key names the object, which does not change when the
-- policy does. This is what makes "public or private" a reversible decision instead of a data
-- migration, and it is worth doing under either answer.
--
-- The key also loses a duplicated path segment. The container is already called `uploads`, so
-- the old `uploads/<uuid>.ext` prefix produced `/uploads/uploads/<uuid>.ext`.

-- ---------------------------------------------------------------------------------------------
-- STEP 1 — verify BEFORE changing anything.
--
-- Ordering is the whole point of this block. An earlier draft renamed the column first and
-- checked afterwards; a row that failed the check then left the table half-migrated, because the
-- rename had already committed. Verified by running it against a deliberately unconvertible row.
-- Checking first means a failure leaves the table exactly as it was, without depending on
-- whether the migration runner wraps the file in a transaction.
--
-- Expected population when written: 1 row on UAT, 0 in prod — nothing could upload successfully
-- in either environment before 2026-08-24 (see the change's design.md). That expectation is NOT
-- trusted, which is what this block is for.
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
  FROM "uploads"
  WHERE regexp_replace("minio_url", '^.*/', '') = ''
     OR regexp_replace("minio_url", '^.*/', '') LIKE '%/%';

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'uploads.minio_url: % row(s) cannot be reduced to a bare object key. Migration aborted with nothing changed — inspect these rows first.',
      bad_count;
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- STEP 2 — rename, then reduce each URL to its key.
ALTER TABLE "uploads" RENAME COLUMN "minio_url" TO "storage_key";

-- Everything after the final '/' — turns
--   https://<account>.blob.core.windows.net/uploads/uploads/<uuid>.png
-- into
--   <uuid>.png
-- and leaves a value that is already a bare key untouched.
UPDATE "uploads"
SET "storage_key" = regexp_replace("storage_key", '^.*/', '')
WHERE "storage_key" LIKE '%/%';

-- ---------------------------------------------------------------------------------------------
-- STEP 3 — what an upload is FOR decides who may see it: blog images are published content,
-- chat and experience images are not. The resolver endpoint is handed only a key, so the purpose
-- has to be stored rather than inferred.
CREATE TYPE "upload_purpose" AS ENUM ('chat', 'experience', 'blog');

-- Default 'experience' — the PRIVATE case, chosen deliberately. Existing rows predate the
-- column, so their purpose is unknown; defaulting an unknown to the restrictive value fails
-- closed. (The single known row on UAT is in fact an experience upload, from #178's probe.)
ALTER TABLE "uploads" ADD COLUMN "purpose" "upload_purpose" NOT NULL DEFAULT 'experience';

-- The resolver looks a row up by key on every private image view, so this is a hot path.
CREATE INDEX "uploads_storage_key_idx" ON "uploads"("storage_key");
