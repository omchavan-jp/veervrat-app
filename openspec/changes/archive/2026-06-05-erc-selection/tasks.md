## 1. Backend — Exceptions & DTOs

- [x] 1.1 Add `ErcAlreadySelectedException` (409, `ERC_ALREADY_SELECTED`) and `InvalidErcStatusTransitionException` (409, `INVALID_ERC_STATUS_TRANSITION`) to `apps/api/src/common/exceptions/app.exceptions.ts`
- [x] 1.2 Create `apps/api/src/modules/erc/dto/select-erc.dto.ts` — `poolItemId: string (IsUUID)` (used for all three types)
- [x] 1.3 Create `apps/api/src/modules/erc/dto/update-erc-status.dto.ts` — `status: 'in_progress'|'submitted'|'approved'|'revisit' (IsIn)`

## 2. Backend — Repository

- [x] 2.1 Create `apps/api/src/modules/erc/erc.repository.ts`:
  - `getPool(journeyId, ercType)` — pool items (Exposure/Resolution/Challenge) whose weakness tags intersect journey's weaknesses, excluding already-selected ones; uses Prisma `some` filter on the weakness join table
  - `listJourneyItems(journeyId, ercType)` — all items (active + deactivated) for a journey
  - `findById(id, ercType)` — single JourneyExposure/Resolution/Challenge by id
  - `findByPoolItemId(journeyId, poolItemId, ercType)` — check if pool item already selected
  - `selectPoolItem(journeyId, poolItemId, ercType)` — creates JourneyExposure/Resolution/Challenge from pool data
  - `updateStatus(id, status, timestamps, ercType)` — updates status + relevant timestamp
  - `setDeactivated(id, isDeactivated, ercType)` — toggles isDeactivated
  - `remove(id, ercType)` — deletes JourneyExposure/Resolution/Challenge row

## 3. Backend — Service

- [x] 3.1 Create `apps/api/src/modules/erc/erc.service.ts`:
  - `getPool(user, journeyId, ercType)` — verify journey.view permission, delegate to repo
  - `selectItem(user, journeyId, poolItemId, ercType)` — verify erc.select permission, check no duplicate, create
  - `listItems(user, journeyId, ercType)` — verify journey.view permission, delegate to repo
  - `getItem(user, journeyId, itemId, ercType)` — verify journey.view permission, fetch item
  - `updateStatus(user, journeyId, itemId, targetStatus, ercType)`:
    - verify journey ownership (erc.select proxy)
    - validate transition using VALID_TRANSITIONS map
    - if targetStatus=APPROVED: check no active VM (erc.approve_closure); throw 403 if VM assigned
    - if targetStatus=REVISIT: require VM permission (erc.approve_closure as VM) — will 403 for VA
    - update with correct timestamp fields
  - `deactivate(user, journeyId, itemId, ercType)` — verify erc.deactivate permission, set isDeactivated=true
  - `reactivate(user, journeyId, itemId, ercType)` — verify erc.deactivate permission, set isDeactivated=false
  - `remove(user, journeyId, itemId, ercType)` — verify erc.remove permission, delete row

## 4. Backend — Controller & Module

- [x] 4.1 Create `apps/api/src/modules/erc/erc.controller.ts` with routes nested under `/journeys/:journeyId`:
  - `GET /journeys/:journeyId/exposures/pool` → getPool('exposure')
  - `POST /journeys/:journeyId/exposures` → selectItem('exposure')
  - `GET /journeys/:journeyId/exposures` → listItems('exposure')
  - `PATCH /journeys/:journeyId/exposures/:itemId/status` → updateStatus('exposure')
  - `POST /journeys/:journeyId/exposures/:itemId/deactivate` → deactivate('exposure')
  - `POST /journeys/:journeyId/exposures/:itemId/reactivate` → reactivate('exposure')
  - `DELETE /journeys/:journeyId/exposures/:itemId` → remove('exposure')
  - Same 7 routes × resolutions + challenges = 21 total routes
- [x] 4.2 Create `apps/api/src/modules/erc/erc.module.ts` — imports AuthModule + JourneysModule (for journey detail/permission checks); exports ErcService
- [x] 4.3 Register `ErcModule` in `apps/api/src/app.module.ts`

## 5. Backend — Tests

- [x] 5.1 Create `apps/api/src/modules/erc/erc.service.spec.ts`:
  - AUTH MATRIX POSITIVE: `erc.select` — VA owner can select pool item
  - AUTH MATRIX NEGATIVE: `erc.select` — non-owner VA gets 403
  - AUTH MATRIX NEGATIVE: `erc.select` — no session gets 401 (documented; enforced by SessionGuard on controller)
  - UNIT: `selectItem` — throws ErcAlreadySelectedException when pool item already in journey
  - UNIT: `updateStatus NOT_STARTED→IN_PROGRESS` — succeeds, sets startedAt
  - UNIT: `updateStatus IN_PROGRESS→APPROVED` — throws InvalidErcStatusTransition (wrong order)
  - UNIT: `updateStatus SUBMITTED→APPROVED` — succeeds when no VM, throws AccessDenied when VM assigned
  - UNIT: `updateStatus on deactivated item` — throws InvalidErcStatusTransition
  - UNIT: `deactivate` — sets isDeactivated=true; `reactivate` sets it false

## 6. Frontend — API Layer

- [x] 6.1 Add ERC functions to `apps/web/lib/api/journeys.ts`:
  - Types: `JourneyExposure`, `JourneyResolution`, `JourneyChallenge`, `PoolExposure`, `PoolResolution`, `PoolChallenge`
  - `ercApi.getPool(journeyId, type)` → GET /journeys/:id/{type}s/pool
  - `ercApi.select(journeyId, type, poolItemId)` → POST /journeys/:id/{type}s
  - `ercApi.list(journeyId, type)` → GET /journeys/:id/{type}s
  - `ercApi.updateStatus(journeyId, type, itemId, status)` → PATCH /journeys/:id/{type}s/:eid/status
  - `ercApi.deactivate(journeyId, type, itemId)` → POST /journeys/:id/{type}s/:eid/deactivate
  - `ercApi.reactivate(journeyId, type, itemId)` → POST /journeys/:id/{type}s/:eid/reactivate
  - `ercApi.remove(journeyId, type, itemId)` → DELETE /journeys/:id/{type}s/:eid
- [x] 6.2 Add `erc` namespace to `apps/web/lib/api/query-keys.ts`:
  - `erc.pool(journeyId, type)`, `erc.list(journeyId, type)`
- [x] 6.3 Add ERC hooks to `apps/web/hooks/use-journeys.ts`:
  - `useErcPool(journeyId, type)`, `useErcItems(journeyId, type)`
  - `useSelectErc()`, `useUpdateErcStatus()`, `useDeactivateErc()`, `useReactivateErc()`, `useRemoveErc()`
  - All mutations invalidate `erc.list(journeyId, type)` and `journeys.detail(journeyId)` on success

## 7. Frontend — ERC Tab Components

- [x] 7.1 Create `apps/web/components/journey/erc-pool-section.tsx` — shared collapsible pool section; props: journeyId, ercType, onSelect; renders pool items with Select button
- [x] 7.2 Create `apps/web/components/journey/erc-item-card.tsx` — shared active item card; props: item, ercType, journeyId, hasVm; renders status badge, action buttons (Start/Submit/Self-approve/Deactivate/Reactivate/Remove)
- [x] 7.3 Create `apps/web/components/journey/exposures-tab.tsx` — uses erc-pool-section + erc-item-card for exposures; shows empty state
- [x] 7.4 Create `apps/web/components/journey/resolutions-tab.tsx` — same as exposures + shows frequencyLabel on cards; "Log check-in" button renders but is disabled with tooltip "Coming soon" (item 13)
- [x] 7.5 Create `apps/web/components/journey/challenges-tab.tsx` — same as exposures + shows durationDays on cards
- [x] 7.6 Update `apps/web/app/(app)/journeys/[id]/page.tsx` — replace stub tab content with the three tab components; pass `journey` and `journeyId` as props

## 8. Frontend — i18n

- [x] 8.1 Add `erc` namespace to `apps/web/messages/en.json`: keys for pool (title, empty, select, selecting), items (statusBadges: notStarted/inProgress/submitted/approved, actions: start/submit/selfApprove/deactivate/reactivate/remove), tier labels (local/national/international), emptyActiveState
- [x] 8.2 Add matching `erc` namespace to `apps/web/messages/mr.json`

## 9. Frontend — Tests

- [x] 9.1 Create `apps/web/src/test/erc-tabs.test.tsx`:
  - ExposuresTab renders pool section and active items (vi.hoisted for API mocks)
  - Select button calls selectErc mutation
  - Action buttons render correctly per status (Start for NOT_STARTED, Submit for IN_PROGRESS)
  - Deactivated items show Reactivate + Remove instead of status actions
  - Empty pool state renders correct message
- [x] 9.2 Run `pnpm test` in both apps — all tests must pass
