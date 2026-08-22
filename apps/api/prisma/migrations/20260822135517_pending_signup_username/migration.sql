-- A pending signup carries a chosen username through the Google round trip.
--
-- Existing rows cannot be given one: nobody chose a username for them, and inventing a value for
-- a record whose entire purpose is to carry the person's actual choice would be worse than
-- losing the row. They are cleared instead.
--
-- That is safe here in a way most row deletions are not. A pending signup is a handoff that
-- lives for minutes — created when someone starts Google signup, consumed the moment they
-- return, and removed by a scheduled job otherwise. Discarding one means a person mid-signup
-- starts again, and the effect is visible to them rather than silent.
--
-- ⚠️ Written after this migration failed on a deployed environment with 23502 (not-null
-- violation). The local table happened to be empty, so it applied cleanly and the defect stayed
-- invisible until it met real rows. Prisma's generated warning said exactly this and was easy to
-- read past. See conventions §25.
DELETE FROM "pending_signups";

-- AlterTable
ALTER TABLE "pending_signups" ADD COLUMN     "username" TEXT NOT NULL;
