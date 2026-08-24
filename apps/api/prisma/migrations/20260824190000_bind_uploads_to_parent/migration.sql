-- Bind an upload to the experience log that contains it (#178).
--
-- An attachment is not an independent resource: its visibility derives from the document it sits
-- inside. Without this link the question "who may see this image?" is unanswerable, because an
-- upload row knows only who uploaded it — the image is uploaded while composing, before the log
-- exists.
--
-- Every alternative reimplements a subset of the log's visibility rules in a second place, and
-- gets them wrong immediately: public experience logs are readable with NO session
-- (OptionalSessionGuard on the public pool and on GET :id), so any "must be signed in" or
-- "must be the uploader or their vratmitra" rule breaks published content for its actual
-- audience. With this link the resolver calls the same `getOne` the app already uses, and
-- ONLY_ME / FRIENDS / PUBLIC / guest access all follow from one authority instead of two.
--
-- Nullable on purpose. An upload is an orphan between being uploaded and its log being saved,
-- and stays one if the log is never saved. Orphans are readable only by their uploader.
--
-- Chat needs no equivalent: `room_id` is already recorded at upload time, because the composer
-- knows the room. Blog images are published content and live in the public container.
ALTER TABLE "uploads"
  ADD COLUMN "experience_log_id" uuid;

-- ON DELETE SET NULL, not CASCADE: deleting a log must not delete the upload row, because
-- nothing deletes the underlying blob (data-map §2) and a row with no blob is less misleading
-- than a blob with no row. The upload simply reverts to being an orphan.
ALTER TABLE "uploads"
  ADD CONSTRAINT "uploads_experience_log_id_fkey"
  FOREIGN KEY ("experience_log_id") REFERENCES "experience_logs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "uploads_experience_log_id_idx" ON "uploads"("experience_log_id");
