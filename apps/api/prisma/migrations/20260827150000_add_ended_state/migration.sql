-- Add ENDED to vm_relationship_state enum and backfill relationships that have ended.
--
-- Until now, ending a relationship set `ended_at` while leaving `state = 'active'`,
-- requiring every query to double-check `ended_at IS NULL`. With ENDED, the state column
-- is honest and queries need only `state = 'active'`.

ALTER TYPE "vm_relationship_state" ADD VALUE IF NOT EXISTS 'ended';

-- Backfill: any row with ended_at set is ended, regardless of current state.
UPDATE "vm_relationships"
   SET "state" = 'ended'
 WHERE "ended_at" IS NOT NULL
   AND "state" != 'ended';

UPDATE "journey_vm_assignments"
   SET "state" = 'ended'
 WHERE "ended_at" IS NOT NULL
   AND "state" != 'ended';
