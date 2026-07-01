## 1. Schema & migration

- [ ] 1.1 Add a comment in `schema.prisma` on the `Journey` model documenting the partial
  unique index (Prisma can't express the `WHERE` predicate declaratively).
- [ ] 1.2 Create a Prisma migration with raw SQL:
  `CREATE UNIQUE INDEX "journeys_vratarthi_sentence_live_key" ON "journeys" ("vratarthi_id", "sentence_id") WHERE "deleted_at" IS NULL AND "state" <> 'completed';`
- [ ] 1.3 Verify the migration applies cleanly against the dev DB (no duplicate rows block
  index creation — already confirmed zero live duplicates platform-wide).

## 2. Service error handling

- [ ] 2.1 In `createJourney`, wrap the repository insert so a Prisma `P2002`
  (unique-violation) on the new index is caught and mapped to
  `JourneyConflictException`, re-running `findActiveForSentence` to populate the winning
  journey's id/state (fall back to a generic conflict if that lookup returns null).
- [ ] 2.2 Keep the existing application-level pre-check (happy-path short-circuit).

## 3. Tests

- [ ] 3.1 Service test: when the repository insert throws `P2002`, `createJourney` throws
  `JourneyConflictException` with the existing journey's id/state (mock the repo to throw
  a `P2002` and to return the winner from `findActiveForSentence`).
- [ ] 3.2 Service test: re-journeying a `completed` sentence succeeds (pre-check returns
  null, insert proceeds).
- [ ] 3.3 Confirm the existing sequential-duplicate test still passes (app-check path).

## 4. Verify

- [ ] 4.1 `pnpm --filter api test` green (journeys module).
- [ ] 4.2 `pnpm --filter api typecheck` / build clean.
- [ ] 4.3 Manual: two rapid create requests for the same sentence yield one journey + one
  conflict (not a 500).
