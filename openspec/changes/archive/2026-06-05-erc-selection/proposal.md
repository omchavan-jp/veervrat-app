## Why

Journey detail pages exist (item 11) but the Exposures, Resolutions, and Challenges tabs are stubs — VAs cannot actually work on their journeys. This blocks the entire "Work on your weakness" flow (Flow 2). Item 12 closes that gap: VA can select pool ERC items into their journey, move items through the status lifecycle, and deactivate/reactivate them.

## What Changes

- **Backend**: ERC module handling 15 routes (5 per ERC type × 3 types): pool list (union-filtered), select, status update, deactivate, reactivate; plus list of active journey ERC items
- **Backend**: Union filter query — pool items whose weakness tags intersect journey's weakness tags, evaluated dynamically
- **Frontend**: Replace stub tabs on `/journeys/[id]` with live Exposures, Resolutions, and Challenges tabs per the spec screen design
- **Frontend**: Pool section (collapsible, top of each tab) with "Select" buttons; active items below grouped by status with per-status action buttons

## Capabilities

### New Capabilities
- `erc-pool`: List ERC pool items available for a journey (filtered by union of journey weakness tags). Guest-inaccessible — requires authenticated VA who owns the journey.
- `erc-select`: Select a pool exposure/resolution/challenge into a journey (creates JourneyExposure/Resolution/Challenge row). Enforces no-duplicate-selection per pool item per journey.
- `erc-status`: Update ERC item status — NOT_STARTED→IN_PROGRESS (start), IN_PROGRESS→SUBMITTED (submit for closure), SUBMITTED→APPROVED (self-approve when no VM), SUBMITTED→REVISIT (VM only — deferred to item 15 but endpoint protected).
- `erc-deactivate`: Deactivate/reactivate a journey ERC item (isDeactivated toggle). Permanent remove is also implemented.
- `erc-tabs`: Frontend Exposures, Resolutions, Challenges tabs with pool section + active items section.

### Modified Capabilities
- `journey-shell`: Status Overview ERC counts now reflect live data (already wired from item 11); tabs become live instead of stubs.

## Impact

**Backend — new files:**
- `apps/api/src/modules/erc/erc.module.ts`
- `apps/api/src/modules/erc/erc.controller.ts` (all 15 routes, scoped under journeys/:id)
- `apps/api/src/modules/erc/erc.service.ts`
- `apps/api/src/modules/erc/erc.repository.ts`
- `apps/api/src/modules/erc/dto/select-erc.dto.ts`
- `apps/api/src/modules/erc/dto/update-erc-status.dto.ts`
- `apps/api/src/modules/erc/erc.service.spec.ts`

**Backend — modified:**
- `apps/api/src/app.module.ts` — register ErcModule
- `apps/api/src/common/exceptions/app.exceptions.ts` — ErcAlreadySelectedException, InvalidErcStatusTransitionException

**Frontend — modified:**
- `apps/web/app/(app)/journeys/[id]/page.tsx` — replace stub tabs with live ERC tab components
- `apps/web/lib/api/journeys.ts` — add ERC API functions
- `apps/web/lib/api/query-keys.ts` — add erc namespace
- `apps/web/messages/en.json` + `mr.json` — erc namespace keys

**Frontend — new files:**
- `apps/web/components/journey/exposures-tab.tsx`
- `apps/web/components/journey/resolutions-tab.tsx`
- `apps/web/components/journey/challenges-tab.tsx`
- `apps/web/src/test/erc-tabs.test.tsx`

**No DB migrations.** All JourneyExposure/Resolution/Challenge tables exist.
