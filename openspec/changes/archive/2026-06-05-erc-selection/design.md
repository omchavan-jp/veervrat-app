## Context

All JourneyExposure/Resolution/Challenge tables exist with the correct schema. The ErcStatus enum has all 5 states. The permission system fully implements erc.select, erc.deactivate, erc.remove, and erc.approve_closure. The JourneysModule and JourneysRepository already exist — ErcModule will import JourneysModule to reuse journey fetching and permission checking.

The union filter is the core query: for a given journey, find all pool ERC items tagged with at least one weakness that also tags the journey. In Prisma this is a nested `some` filter with a join through the join table.

## Goals / Non-Goals

**Goals:**
- Pool list per ERC type with union filter, excluding already-selected items
- Select from pool (create JourneyExposure/Resolution/Challenge from pool item)
- Status transitions: NOT_STARTED→IN_PROGRESS, IN_PROGRESS→SUBMITTED, SUBMITTED→APPROVED (self-approve only), SUBMITTED→REVISIT blocked (VM only — returns 403, not implemented here)
- Deactivate (isDeactivated=true) and reactivate (isDeactivated=false)
- Permanent remove (DELETE) — removes JourneyExposure row entirely
- Frontend: pool section (collapsible) + active items per tab with status-gated action buttons

**Non-Goals:**
- SUBMITTED→REVISIT transition (item 15 — VM approval flow)
- Custom ERC creation (item 17)
- VM suggestions/sidenotes on ERC items (item 16)
- Check-in logging on resolutions (item 13)
- Resolution frequency/duration editing (deferred, fields exist but UI not built here)

## Decisions

### Decision 1: Single ErcModule handles all three ERC types

**Chosen:** One `ErcModule` with one controller, one service, one repository. Routes are parameterized by `ercType` path segment: `/journeys/:id/exposures/...`, `/journeys/:id/resolutions/...`, `/journeys/:id/challenges/...`. The service switches on `ercType` to call the right Prisma model.

**Alternative:** Three separate modules (ExposuresModule, ResolutionsModule, ChallengesModule). Rejected — 90% of logic is identical; separate modules triple the boilerplate for no benefit. The type-switching is a small cost.

### Decision 2: Pool list excludes already-selected items

**Chosen:** Pool endpoint returns only pool items NOT already in the journey (excluding deactivated too — those still count as "selected"). This avoids the user seeing "Select" buttons for items they already have.

### Decision 3: Status transitions validated in service, not just in the DB

**Chosen:** `ErcService.updateStatus` checks the current status before updating. Invalid transitions throw `InvalidErcStatusTransitionException` (409). The valid transition map:
```
NOT_STARTED → IN_PROGRESS (start)
IN_PROGRESS → SUBMITTED (submit)
SUBMITTED → APPROVED (self-approve, only if no active journey VM)
SUBMITTED → REVISIT (VM only — service checks permission; VA attempt → 403)
```

### Decision 4: All three ERC types share the same repository methods via a type discriminator

**Chosen:** The repository receives `ercType: 'exposure' | 'resolution' | 'challenge'` and switches on it to call `prisma.journeyExposure`, `prisma.journeyResolution`, or `prisma.journeyChallenge`. TypeScript discriminated types handle the return shapes.

### Decision 5: Frontend tab components receive journeyId as prop, fetch their own data

**Chosen:** `ExposuresTab`, `ResolutionsTab`, `ChallengesTab` are client components that receive `journeyId` and `journey` (for permission context) as props, manage their own query state, and render independently. The parent `/journeys/[id]/page.tsx` just renders the correct tab component.

### Decision 6: Pool section is collapsible, open by default for empty journey, closed by default if items exist

**Chosen:** Matches spec intent — when the journey is new, the pool is the primary action; once items are selected, active items dominate the view and the pool is secondary.

## Risks / Trade-offs

- **[Risk] Union filter query performance** — the nested `some` filter generates a correlated subquery. For 82 exposures with weakness tags, this is fast. If pool grows to thousands, a raw SQL approach may be needed. Mitigation: acceptable for v1 scale.
- **[Risk] Concurrent select of same pool item** — two tabs open could race to select the same item. Mitigation: DB unique constraint on (journeyId, poolExposureId) prevents duplicates; second request gets a 409.
- **[Trade-off] ercType string param** — using a string discriminator in the repository means TypeScript can't fully type-check the Prisma return. Mitigated by careful runtime switching and typed return interfaces.

## Migration Plan

No migrations. Deploy ErcModule → frontend tab components. Rollback: remove ErcModule from AppModule.
