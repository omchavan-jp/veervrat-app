# Tasks: ENDED enum

- [x] 1. Add `ENDED @map("ended")` to `VmRelationshipState` in `schema.prisma`
- [x] 2. Write migration `20260827150000_add_ended_state` — ADD VALUE + backfill
- [x] 3. Update `endGlobalVm`, `endJourneyAssignment`, `endJourneyAssignmentsForVm` to set `state: ENDED`
- [x] 4. Remove `endedAt: null` guards from `vm-relationships.repository.ts` (~18 sites)
- [x] 5. Remove `endedAt: null` guards from `journeys.repository.ts` (3 sites)
- [x] 6. Update `vm-roster.integration.spec.ts` — ended fixture uses `ENDED` state
- [x] 7. Update `vm-access-revocation.integration.spec.ts` — end operations use `ENDED` state
- [x] 8. Apply migration to test DB and verify all tests pass
