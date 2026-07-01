## Why

A vratarthi can end up with duplicate active journeys for the same sentence. The
journey-create flow guards against this only at the application layer
(`createJourney` calls `findActiveForSentence` then inserts — a check-then-insert
with a TOCTOU race). Two near-simultaneous requests (a double-click, or a client
retry) both pass the check before either inserts, producing two rows. This was
observed in local data: two users each had 4 active journeys (2 real + 2 empty
duplicates), each duplicate pair sharing an identical creation timestamp — the
signature of a concurrent double-insert. The duplicates clutter the journeys list
and the dashboard, and there is no database-level backstop.

## What Changes

- Add a **partial unique index** on `journeys (vratarthi_id, sentence_id)` scoped to
  live, non-completed journeys (`deleted_at IS NULL AND state <> 'completed'`), so a
  concurrent second insert is rejected by the database rather than slipping past the
  application check.
- Make `createJourney` **catch the unique-violation** (Prisma `P2002`) and return the
  same `JourneyConflictException` it already returns for the application-level check,
  so the race and the non-race path behave identically for the client.
- No API contract change; no data migration beyond the index (existing duplicates were
  cleaned up separately by soft-delete).

## Capabilities

### New Capabilities
- `journey-uniqueness`: the "one live journey per sentence per vratarthi" rule becomes a
  database-enforced invariant, not just an application-level check.

### Modified Capabilities

## Impact

- **Schema/DB:** new partial unique index via a Prisma migration (`journeys` table).
  Index creation is safe — verified no remaining active-journey duplicates platform-wide.
- **Code:** `journeys.service.ts` (`createJourney` error handling), `journeys.repository.ts`
  (surface the create so the service can catch `P2002`), `schema.prisma`.
- **Tests:** repository/service test for the conflict path (concurrent-insert simulation
  + P2002 mapping).
- **No** frontend change and **no** API response-shape change.
