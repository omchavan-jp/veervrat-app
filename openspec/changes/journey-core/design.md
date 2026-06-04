## Context

All journey schema tables (journeys, journey_weaknesses, journey_vm_assignments, journey_exposures, journey_resolutions, journey_challenges) exist in schema.prisma and are migrated. The permission system fully implements journey.create/view/pause/resume/complete with the correct JourneySlim shape. No new schema changes needed.

The journey detail endpoint needs to build a `JourneySlim` for permission checks — this means the repository must always include `vmAssignments` and the global VM relationship (via VmRelationship table filtered to the journey's vratarthiId).

## Goals / Non-Goals

**Goals:**
- POST /journeys enforces one-non-completed-per-sentence (throws 409 JOURNEY_ALREADY_EXISTS if an active/paused/dormant journey exists for that sentence)
- Journey is created in ACTIVE state with startedAt=now (item 34 handles dormant detection)
- Default title = sentence text (truncated to 100 chars); VA can edit inline
- GET /journeys/:id returns everything needed to render the shell header and Status Overview
- Status Overview ERC counts come from the existing JourneyExposure/Resolution/Challenge tables filtered by status
- Pause/resume transitions are permission-checked with hasPermission; invalid transitions throw

**Non-Goals:**
- Dormant detection (item 34 — background job)
- Journey completion flow (deferred — needs ERC items in submitted state)
- ERC selection tabs (items 12-13)
- Chat tab (item 20)
- VM invitation flow (item 14)

## Decisions

### Decision 1: Journey created as ACTIVE immediately

**Chosen:** `POST /journeys` sets `state=ACTIVE, startedAt=now`. The spec says `not_started → active` happens on first ERC selection, but for item 11 scope we simplify — the journey becomes active the moment the VA decides to start it. This keeps the state machine clean for item 12 (ERC selection) without a hollow NOT_STARTED state sitting around.

**Alternative:** Create in NOT_STARTED and transition to ACTIVE on first ERC select. Rejected — adds complexity to item 12 with no UX benefit; the VA already made an intentional choice to start.

### Decision 2: Global VM resolved via VmRelationship table at query time

**Chosen:** `journeys.repository.findById` joins `VmRelationship` where `vratarthiId = journey.vratarthiId AND state = ACTIVE` to find the global VM. This populates `globalVmRelationship` in the JourneySlim for permission checks.

**Rationale:** The JourneySlim type requires `globalVmRelationship` for `isGlobalVmForJourney()`. Fetching it at repository time keeps the service clean.

### Decision 3: One-per-sentence check in service, not DB constraint

**Chosen:** `journeys.service.createJourney` queries for any existing journey for (userId, sentenceId) where state NOT IN (COMPLETED, deleted). If found, throws `JourneyConflictException` (409). No DB unique constraint — completed journeys are allowed to be re-done on the same sentence.

### Decision 4: Title defaults to sentence text, editable inline

**Chosen:** On create, `title = sentence.textEn.slice(0, 100)` if no title provided. Frontend uses a controlled input that patches `/journeys/:id/title` on blur (debounced save, same pattern as test answers). No real-time collab needed.

### Decision 5: Status Overview ERC counts via Prisma _count

**Chosen:** The detail endpoint returns `_count` groups for JourneyExposure/Resolution/Challenge filtered by ErcStatus. This is a single query per entity type — acceptable at this scale. Counts needed: total, active (IN_PROGRESS), approved (APPROVED).

### Decision 6: Frontend /journeys/new is a client component that fires the mutation immediately

**Chosen:** The page reads `sentenceId` and `weaknessId` from query params, calls `useCreateJourney()` on mount (no form), and redirects to `/journeys/[id]` on success. Loading spinner shown while pending. Same pattern as `/study/[id]/test/page.tsx`.

## Risks / Trade-offs

- **[Risk] One-per-sentence check has a race condition** — two concurrent creates for the same sentence could both pass the check and both succeed. Mitigation: acceptable for v1 (low probability, easily resolved by soft-delete of one); a DB unique partial index can be added later if needed.
- **[Risk] `/journeys/new` has no form** — if the user navigates directly without query params, the page shows an error state. Mitigation: redirect to `/study` with an error message.
- **[Trade-off] ACTIVE on create** — dormant detection (item 34) will look at `updatedAt < 30 days` and `state = ACTIVE`. This is fine — the field is correct from day one.

## Migration Plan

No migrations needed. Deploy backend JourneysModule → deploy frontend pages. Rollback: remove JourneysModule from AppModule imports.
