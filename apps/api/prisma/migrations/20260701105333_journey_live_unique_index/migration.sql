-- Enforce "one live journey per (vratarthi, sentence)" at the database level.
-- A live journey is non-deleted and not completed; completed/soft-deleted journeys for
-- the same sentence are allowed (a vratarthi may re-journey a sentence after completing
-- it). This is the DB backstop for the application-level check in
-- JourneysService.createJourney, closing the check-then-insert race that allowed
-- concurrent requests to create duplicates.
CREATE UNIQUE INDEX "journeys_vratarthi_sentence_live_key"
  ON "journeys" ("vratarthi_id", "sentence_id")
  WHERE "deleted_at" IS NULL AND "state" <> 'completed';
