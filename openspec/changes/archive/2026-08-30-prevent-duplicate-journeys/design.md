## Context

`JourneysService.createJourney` enforces "one active journey per (vratarthi, sentence)"
by calling `journeysRepository.findActiveForSentence(...)` and throwing
`JourneyConflictException` if one exists. Because the check and the insert are separate
statements with no DB constraint underneath, two concurrent requests can both read
"none exists" and both insert. `findActiveForSentence` considers a journey live when
`deleted_at IS NULL` and `state IN (not_started, active, paused, dormant)` — i.e. any
non-completed, non-deleted state. Completed journeys are intentionally allowed to
coexist (a user may re-journey a sentence after completing it).

## Goals / Non-Goals

**Goals:**
- Make the "one live journey per (vratarthi, sentence)" rule a database invariant.
- Keep the client-visible behavior identical: a duplicate attempt returns
  `JourneyConflictException`, whether it lost the app check or the DB race.
- Allow multiple *completed* (or soft-deleted) journeys for the same sentence.

**Non-Goals:**
- Cleaning up existing duplicates (already handled out-of-band by soft-delete).
- Any change to the create API request/response shape.
- Debouncing on the client (belt only; the DB constraint is the braces).

## Decisions

1. **Partial unique index, not a plain unique constraint.** A plain
   `@@unique([vratarthiId, sentenceId])` would forbid ever re-journeying a sentence
   after completion, and would collide with soft-deleted rows. Use a partial index:
   `UNIQUE (vratarthi_id, sentence_id) WHERE deleted_at IS NULL AND state <> 'completed'`.
   This matches exactly the states `findActiveForSentence` treats as blocking.

2. **Prisma can't express a partial unique index in `schema.prisma`.** Declare a plain
   `@@index` placeholder is not enough. Instead, hand-write the `CREATE UNIQUE INDEX
   ... WHERE ...` in the migration SQL and annotate the model with a comment pointing to
   it. Prisma introspection tolerates the extra index; `migrate` applies the raw SQL.
   Use `CREATE UNIQUE INDEX CONCURRENTLY`? No — migrations run in a transaction and
   `CONCURRENTLY` can't; the table is small and this runs at deploy, so a plain
   `CREATE UNIQUE INDEX` is fine.

3. **Service catches `P2002` and re-throws `JourneyConflictException`.** The repository
   `create` is wrapped so the service maps Prisma's unique-violation to the existing
   domain exception. To populate the exception's `existingId`/`state` (as the app-check
   path does), on `P2002` the service re-runs `findActiveForSentence` to fetch the
   winner and throws with its id/state. If that lookup somehow returns null (extreme
   race with a concurrent delete), fall back to a generic conflict.

4. **Keep the application-level pre-check.** It still short-circuits the common case
   without hitting a constraint violation (cheaper, and gives the precise existing-id
   without a second query on the happy path). The index is the safety net for the race.

## Risks / Trade-offs

- **Migration safety:** creating a unique index fails if duplicates exist. Mitigated —
  verified zero remaining live duplicates platform-wide before writing the migration.
  The migration is still additive and reversible (drop index).
- **Partial-index drift:** if the set of "blocking" states in `findActiveForSentence`
  ever changes, the index predicate must change with it. Documented in a schema comment
  next to the index so the two stay in sync.
- **`state <> 'completed'` vs enumerating states:** using the negation keeps the index
  correct if new non-terminal states are added later, matching the intent "any live,
  non-completed journey is unique per sentence."
