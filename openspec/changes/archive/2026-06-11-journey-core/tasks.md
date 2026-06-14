## 1. Backend — Repository

- [x] 1.1 Create `apps/api/src/modules/journeys/journeys.repository.ts`:
  - `findActiveForSentence(userId, sentenceId)` — finds any non-completed journey for user+sentence
  - `create(params: { vratarthiId, sentenceId, weaknessId, title })` — creates Journey + JourneyWeakness in a transaction; returns journey with full relations
  - `findAll(userId, cursor?)` — paginated list for a user, ordered updatedAt DESC; includes sentence.textEn and weakness names
  - `findById(id)` — full detail: sentence→subvirtue→virtue, weaknesses, vmAssignments, VmRelationship (global VM), ERC counts (_count by status for exposures/resolutions/challenges)
  - `updateState(id, state, timestamps)` — updates state + relevant timestamp fields
  - `updateTitle(id, title)` — updates title only
  - `buildJourneySlim(journey)` — builds JourneySlim from the full journey record for hasPermission checks

## 2. Backend — Exceptions & DTOs

- [x] 2.1 Add `JourneyConflictException` to `apps/api/src/common/exceptions/app.exceptions.ts` (409, error: `JOURNEY_ALREADY_EXISTS`, includes `existingJourneyId` in details)
- [x] 2.2 Add `InvalidStateTransitionException` to `apps/api/src/common/exceptions/app.exceptions.ts` (409, error: `INVALID_STATE_TRANSITION`)
- [x] 2.3 Create `apps/api/src/modules/journeys/dto/create-journey.dto.ts` — `sentenceId: string (IsUUID)`, `weaknessId: string (IsUUID)`, `title?: string (IsOptional, IsString, MaxLength 255)`
- [x] 2.4 Create `apps/api/src/modules/journeys/dto/update-journey-state.dto.ts` — `action: 'pause' | 'resume' (IsIn)`
- [x] 2.5 Create `apps/api/src/modules/journeys/dto/update-journey-title.dto.ts` — `title: string (IsString, MinLength 1, MaxLength 255)`

## 3. Backend — Service

- [x] 3.1 Create `apps/api/src/modules/journeys/journeys.service.ts`:
  - `createJourney(userId, dto)` — checks one-per-sentence constraint (throws JourneyConflictException with existingId if violated), creates journey, returns detail
  - `listJourneys(user, cursor?)` — returns paginated list for VA (own) or VM (assigned)
  - `getJourney(user, id)` — fetches detail, builds JourneySlim, checks hasPermission(journey.view), returns full detail
  - `updateState(user, id, action)` — fetches journey, builds JourneySlim, checks hasPermission(journey.pause or journey.resume), validates transition, calls repository
  - `updateTitle(user, id, title)` — fetches journey, checks ownership, updates title

## 4. Backend — Controller & Module

- [x] 4.1 Create `apps/api/src/modules/journeys/journeys.controller.ts`:
  - `POST /journeys` — SessionGuard, calls `createJourney`
  - `GET /journeys` — SessionGuard, calls `listJourneys`
  - `GET /journeys/:id` — SessionGuard, calls `getJourney`
  - `PATCH /journeys/:id/state` — SessionGuard, calls `updateState`
  - `PATCH /journeys/:id/title` — SessionGuard, calls `updateTitle`
- [x] 4.2 Create `apps/api/src/modules/journeys/journeys.module.ts` — imports AuthModule, exports JourneysService
- [x] 4.3 Register `JourneysModule` in `apps/api/src/app.module.ts`

## 5. Backend — Tests

- [x] 5.1 Create `apps/api/src/modules/journeys/journeys.service.spec.ts`:
  - AUTH MATRIX POSITIVE: `journey.create` — VA can create journey
  - AUTH MATRIX NEGATIVE: `journey.create` — no session → 401 (verified via controller, documented here)
  - UNIT: `createJourney` — throws JourneyConflictException when active journey exists for same sentence
  - UNIT: `createJourney` — allows create when only completed journey exists for sentence
  - UNIT: `updateState pause` — ACTIVE→PAUSED succeeds; PAUSED→PAUSED throws InvalidStateTransition
  - UNIT: `updateState resume` — PAUSED→ACTIVE succeeds; ACTIVE→ACTIVE throws InvalidStateTransition
  - UNIT: `getJourney` — throws AccessDeniedException when user doesn't own journey and isn't assigned VM

## 6. Frontend — API Layer

- [x] 6.1 Create `apps/web/lib/api/journeys.ts` — typed functions and response types:
  - Types: `Journey`, `JourneyDetail`, `JourneySummary`, `ErcCounts`
  - `journeysApi.create(data)` → `POST /journeys`
  - `journeysApi.list(cursor?)` → `GET /journeys`
  - `journeysApi.detail(id)` → `GET /journeys/:id`
  - `journeysApi.updateState(id, action)` → `PATCH /journeys/:id/state`
  - `journeysApi.updateTitle(id, title)` → `PATCH /journeys/:id/title`
- [x] 6.2 Create `apps/web/hooks/use-journeys.ts`:
  - `useJourneys()` — TanStack Query list
  - `useJourney(id)` — TanStack Query detail
  - `useCreateJourney()` — mutation
  - `useUpdateJourneyState()` — mutation, invalidates journey detail on success
  - `useUpdateJourneyTitle()` — mutation with debounce (600ms), invalidates journey detail

## 7. Frontend — Pages

- [x] 7.1 Create `apps/web/app/(app)/journeys/new/page.tsx` — `'use client'`; reads `sentenceId` + `weaknessId` from `useSearchParams()`; calls `useCreateJourney()` on mount; on 409 redirects to existing journey; on missing params redirects to `/study`; shows spinner while pending
- [x] 7.2 Create `apps/web/app/(app)/journeys/page.tsx` — `'use client'`; uses `useJourneys()`; renders journey cards (title, sentence excerpt, state badge, weakness tags, last updated); empty state with link to `/study`
- [x] 7.3 Create `apps/web/app/(app)/journeys/[id]/page.tsx` — `'use client'`; uses `useJourney(id)`:
  - Shell header: inline title edit (blur → `useUpdateJourneyTitle`), sentence EN + MR, "Cultivating [subvirtue] → [virtue]", weakness tag chips, state badge, VM name or "No VM", Pause/Resume button
  - Tab bar: Status Overview (active) | Exposures (stub) | Resolutions (stub) | Challenges (stub) | Chat (stub)
  - Status Overview: if ERC counts all zero → empty state; else ERC progress cards
  - Add "Journeys" link to header nav

## 8. Frontend — i18n & Nav

- [x] 8.1 Add `journey` namespace to `apps/web/messages/en.json`: keys for list (title, emptyState, emptyStateCta), detail (cultivating, noVm, pause, resume, statusOverview, emptyState, emptyStateCta, tabExposures, tabResolutions, tabChallenges, tabChat), stateBadges (active, paused, dormant, completed)
- [x] 8.2 Add matching `journey` namespace to `apps/web/messages/mr.json`
- [x] 8.3 Add "Journeys" nav link to `apps/web/components/layout/header.tsx`

## 9. Frontend — Tests

- [x] 9.1 Create `apps/web/src/test/journey-list.test.tsx`:
  - Renders journey cards with title, state badge, weakness tags (vi.hoisted for API mock)
  - Empty state renders CTA to /study when no journeys
  - State badge shows correct label per state value
- [x] 9.2 Run `pnpm test` in both apps — all tests must pass before apply is marked done
