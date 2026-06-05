## 1. Backend — Repository

- [x] 1.1 Create `apps/api/src/modules/erc/resolution-checkins.repository.ts` with:
  - `create(resolutionId, status, note?)` — inserts a `ResolutionCheckin` row, returns the created record
  - `listWithStreak(resolutionId)` — fetches all check-ins ordered `checked_in_at ASC`, computes streak (trailing consecutive `DONE` count), returns `{ checkins, streak }`
  - `findResolutionById(id)` — fetches a `JourneyResolution` by id (used by service for ownership + status validation)

## 2. Backend — DTO

- [x] 2.1 Create `apps/api/src/modules/erc/dto/create-checkin.dto.ts` with:
  - `status`: `@IsEnum(CheckinStatus)` (done | partial | missed)
  - `note`: `@IsOptional() @IsString() @MaxLength(500)`

## 3. Backend — Exception

- [x] 3.1 Add `InvalidCheckinStateException` to `apps/api/src/common/exceptions/app.exceptions.ts`:
  - Extends `UnprocessableEntityException`
  - Error code: `INVALID_CHECKIN_STATE`
  - Message: `"Check-ins can only be logged on in-progress resolutions."`

## 4. Backend — Service

- [x] 4.1 Create `apps/api/src/modules/erc/resolution-checkins.service.ts` with:
  - `logCheckin(user, journeyId, resolutionId, status, note?)`:
    - Verify journey exists + VA is owner (reuse `JourneysRepository.findById` + `hasPermission(..., 'erc.select')`)
    - Verify resolution exists and belongs to the journey
    - Guard: throw `InvalidCheckinStateException` if resolution status ≠ `IN_PROGRESS`
    - Delegate to repository `create()`
  - `listCheckins(user, journeyId, resolutionId)`:
    - Verify journey exists + user has `journey.view` permission
    - Verify resolution belongs to journey
    - Delegate to repository `listWithStreak()`

## 5. Backend — Controller

- [x] 5.1 Create `apps/api/src/modules/erc/resolution-checkins.controller.ts` — `@Controller('journeys/:journeyId/resolutions/:resolutionId/checkins')` with `@UseGuards(SessionGuard)`:
  - `@Post()` → `logCheckin(...)` → `201`
  - `@Get()` → `listCheckins(...)` → `200`

## 6. Backend — Module wiring

- [x] 6.1 Register `ResolutionCheckinsController`, `ResolutionCheckinsService`, `ResolutionCheckinsRepository` in `apps/api/src/modules/erc/erc.module.ts`

## 7. Backend — Tests

- [x] 7.1 Create `apps/api/src/modules/erc/resolution-checkins.service.spec.ts`:
  - AUTH MATRIX POSITIVE: VA owner can log check-in on in_progress resolution
  - AUTH MATRIX NEGATIVE: non-owner VA gets 403
  - NEGATIVE: throws `InvalidCheckinStateException` when resolution is NOT_STARTED
  - NEGATIVE: throws `InvalidCheckinStateException` when resolution is SUBMITTED
  - NEGATIVE: throws `InvalidCheckinStateException` when resolution is APPROVED
  - NEGATIVE: throws `EntityNotFoundException` when resolution not found
  - POSITIVE: `listCheckins` — VA owner gets history + streak
  - POSITIVE: `listCheckins` — assigned VM gets history + streak
  - NEGATIVE: `listCheckins` — non-participant gets 403
- [x] 7.2 Create `apps/api/src/modules/erc/resolution-checkins.repository.spec.ts` (pure unit, mock Prisma):
  - `streak` returns 0 for empty list
  - `streak` returns correct count for trailing done run
  - `streak` resets on partial/missed entry
  - `streak` is 0 when last entry is not done

## 8. Frontend — API layer

- [x] 8.1 Add `CheckinStatus` and `ResolutionCheckin` types to `apps/web/lib/api/journeys.ts`
- [x] 8.2 Add `checkinsApi` to `apps/web/lib/api/journeys.ts`:
  - `logCheckin(journeyId, resolutionId, status, note?)` — POST
  - `listCheckins(journeyId, resolutionId)` — GET, returns `{ checkins, streak }`
- [x] 8.3 Add `checkins` query key to `apps/web/lib/api/query-keys.ts`:
  - `checkins.list(journeyId, resolutionId)` → `['journeys', journeyId, 'resolutions', resolutionId, 'checkins']`

## 9. Frontend — Hooks

- [x] 9.1 Add to `apps/web/hooks/use-journeys.ts`:
  - `useCheckins(journeyId, resolutionId)` — `useQuery` wrapping `checkinsApi.listCheckins`
  - `useLogCheckin(journeyId, resolutionId)` — `useMutation` wrapping `checkinsApi.logCheckin`, invalidates `checkins.list` on success

## 10. Frontend — UI components

- [x] 10.1 Create `apps/web/components/journey/checkin-form.tsx` (client component):
  - Three toggle buttons: Done / Partial / Missed (controlled state)
  - Optional note textarea (max 500 chars)
  - Submit button ("Log check-in") — disabled while mutation pending
  - On success: resets form state
- [x] 10.2 Create `apps/web/components/journey/checkin-history.tsx` (client component):
  - Collapsible toggle ("History (N)" label)
  - List of check-in entries: status icon/label + `checkedInAt` relative timestamp + note
  - Streak badge shown at the top when `streak > 0` ("🔥 N")
- [x] 10.3 Update `apps/web/components/journey/resolutions-tab.tsx`:
  - Remove the "Check-in logging coming soon" stub
  - Pass `journeyId` down so `ErcItemCard` can receive it (already does)
- [x] 10.4 Update `apps/web/components/journey/erc-item-card.tsx`:
  - For `ercType === 'resolution'` and `item.status === 'IN_PROGRESS'`: render `<CheckinForm>`
  - For `ercType === 'resolution'`: render `<CheckinHistory>` below the action row

## 11. Frontend — Tests

- [x] 11.1 Create `apps/web/src/test/checkin-form.test.tsx`:
  - Renders Done/Partial/Missed buttons; only one selectable at a time
  - Submit button calls `logCheckin` with correct args (use `vi.hoisted()` for mock, `fireEvent` not `userEvent` if fake timers needed)
  - Submit button disabled while mutation pending
  - Form resets after successful submission
- [x] 11.2 Create `apps/web/src/test/checkin-history.test.tsx`:
  - Shows "History (0)" with no entries when `checkins = []`
  - Expands/collapses on toggle click
  - Shows streak badge when `streak > 0`; hides when `streak = 0`
  - Renders each check-in entry with correct status label and note

## 12. Verify

- [x] 12.1 Run `pnpm exec vitest run --exclude "**/*.integration.spec.ts" --exclude "**/smoke.spec.ts"` from `apps/api` — all tests pass
- [x] 12.2 Run `pnpm exec vitest run` from `apps/web` — all tests pass
- [x] 12.3 Manual smoke: start the dev servers, open a journey with an in-progress resolution, log a done check-in, verify streak increments and history shows the entry
