## 1. Schema & migration

- [x] 1.1 Add a comment in `schema.prisma` on the `Journey` model documenting the partial
  unique index (Prisma can't express the `WHERE` predicate declaratively).
  Done: Comment in schema.prisma on Journey model references `journeys_vratarthi_sentence_live_key`.
- [x] 1.2 Create a Prisma migration with raw SQL:
  `CREATE UNIQUE INDEX "journeys_vratarthi_sentence_live_key" ON "journeys" ("vratarthi_id", "sentence_id") WHERE "deleted_at" IS NULL AND "state" <> 'completed';`
  Done: Migration `20260701105333_journey_live_unique_index/migration.sql`.
- [x] 1.3 Verify the migration applies cleanly against the dev DB (no duplicate rows block
  index creation — already confirmed zero live duplicates platform-wide).
  Done: Migration is in the chain; applies cleanly.

## 2. Service error handling

- [x] 2.1 In `createJourney`, wrap the repository insert so a Prisma `P2002`
  (unique-violation) on the new index is caught and mapped to
  `JourneyConflictException`, re-running `findActiveForSentence` to populate the winning
  journey's id/state (fall back to a generic conflict if that lookup returns null).
  Done: `journeys.service.ts:48-58` — catches P2002, re-lookups winner, throws JourneyConflictException.
- [x] 2.2 Keep the existing application-level pre-check (happy-path short-circuit).
  Done: Pre-check at `journeys.service.ts:26-29` remains in place.

## 3. Tests

- [x] 3.1 Service test: when the repository insert throws `P2002`, `createJourney` throws
  `JourneyConflictException` with the existing journey's id/state (mock the repo to throw
  a `P2002` and to return the winner from `findActiveForSentence`).
  Done: Test "RACE: maps a P2002 from the DB unique index to JourneyConflictException with the winner" at spec line 183.
- [x] 3.2 Service test: re-journeying a `completed` sentence succeeds (pre-check returns
  null, insert proceeds).
  Done: Test "POSITIVE: allows create when only completed journey exists for same sentence" at spec line 174.
- [x] 3.3 Confirm the existing sequential-duplicate test still passes (app-check path).
  Done: Test "NEGATIVE: throws JourneyConflictException when active journey exists for same sentence" at spec line 161. 28/28 tests pass.

## 4. Verify

- [x] 4.1 `pnpm --filter api test` green (journeys module).
  Done 2026-08-27: 28/28 tests pass (2 files, journeys.service.spec.ts + dormant-journeys.cron.spec.ts).
- [x] 4.2 `pnpm --filter api typecheck` / build clean.
  Done 2026-08-27: `tsc --noEmit` clean (0 errors).
- [x] 4.3 Manual: two rapid create requests for the same sentence yield one journey + one
  Done 2026-08-29 against UAT: two genuinely concurrent `POST /journeys` for the same
  `(sentence, weakness)` returned **201 and 409**. The 409 was `JOURNEY_ALREADY_EXISTS`, carrying
  the winning journey's id, and exactly one row existed afterwards. Not a 500, which is the
  outcome this task exists to rule out — the partial unique index rejected the second insert and
  `createJourney` mapped P2002 to the same conflict the application-level check returns.
  conflict (not a 500).
