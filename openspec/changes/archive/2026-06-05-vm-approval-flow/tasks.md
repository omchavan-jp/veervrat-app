## 1. NotificationsModule

- [x] 1.1 Create `apps/api/src/modules/notifications/notifications.repository.ts` with a single `create(recipientId, actorId, eventType, resourceType, resourceId)` method that writes to the `notifications` table
- [x] 1.2 Create `apps/api/src/modules/notifications/notifications.module.ts` exporting `NotificationsRepository`
- [x] 1.3 Import `NotificationsModule` in `apps/api/src/app.module.ts`

## 2. Permission — add erc.revisit

- [x] 2.1 Add `erc.revisit` case to `apps/api/src/common/permissions/has-permission.ts`: VM-only, `isVm(user) && isActiveJourneyVm(user, journey)` — mirrors VM-side of `erc.approve_closure` but without the VA self-approve path
- [x] 2.2 Add `erc.revisit` to the `PermissionAction` union type in the permissions types file

## 3. ErcService — VM approve and revisit methods

- [x] 3.1 Inject `NotificationsRepository` into `ErcModule` (add to imports/providers in `erc.module.ts`)
- [x] 3.2 Add `approveItem(user, journeyId, itemId, ercType)` to `ErcService`:
  - Fetch journey, build slim, check `erc.approve_closure` permission (403 if fails)
  - Fetch item, verify not deactivated and status is SUBMITTED (409 if not)
  - Call `ercRepository.updateStatus(itemId, APPROVED, ercType)`
  - Write notification: `recipientId = journey.vratarthiId`, `actorId = user.id`, `eventType = ERC_CLOSURE_APPROVED`
  - Return updated item
- [x] 3.3 Add `revisitItem(user, journeyId, itemId, ercType)` to `ErcService`:
  - Fetch journey, build slim, check `erc.revisit` permission (403 if fails)
  - Fetch item, verify not deactivated and status is SUBMITTED (409 if not)
  - Call `ercRepository.updateStatus(itemId, REVISIT, ercType)`
  - Write notification: `recipientId = journey.vratarthiId`, `actorId = user.id`, `eventType = ERC_RETURNED_FOR_REVISIT`
  - Return updated item
- [x] 3.4 Remove the REVISIT placeholder `throw new AccessDeniedException()` from `updateStatus` in `ErcService` — REVISIT is now handled exclusively by `revisitItem`; guard instead: if `targetStatus === ErcStatus.REVISIT`, throw `AccessDeniedException` (VA cannot set REVISIT via PATCH /status)

## 4. ErcController — new VM routes

- [x] 4.1 Add `POST :itemId/approve` and `POST :itemId/revisit` to `ExposuresController` in `erc.controller.ts`
- [x] 4.2 Add same two routes to `ResolutionsController`
- [x] 4.3 Add same two routes to `ChallengesController`

## 5. JourneysService — completion methods

- [x] 5.1 Inject `NotificationsRepository` into `JourneysModule` and `JourneysService`
- [x] 5.2 Add `setCompleted(id)` to `JourneysRepository` that sets `state = COMPLETED, completedAt = now()`
- [x] 5.3 Add `submitCompletion(user, journeyId)` to `JourneysService`
- [x] 5.4 Add `approveCompletion(user, journeyId)` to `JourneysService`

## 6. JourneysController — completion routes

- [x] 6.1 Add `POST /journeys/:id/complete` → `journeysService.submitCompletion(user, id)` with `@HttpCode(HttpStatus.OK)` (will be 202 in service response for VM-assigned case — handled at service level)
- [x] 6.2 Add `POST /journeys/:id/complete/approve` → `journeysService.approveCompletion(user, id)` with `@HttpCode(HttpStatus.OK)`

## 7. Tests

- [x] 7.1 Update `erc.service.spec.ts`: replace the existing `"NEGATIVE: REVISIT always throws AccessDenied (VM-only, item 15)"` test with correct name + add revisitItem suite
- [x] 7.2 Add `approveItem` tests in `erc.service.spec.ts`
- [x] 7.3 Add `updateStatus` REVISIT regression test
- [x] 7.4 Add journey completion tests in `journeys.service.spec.ts`
- [x] 7.5 Run `pnpm test --filter api` and confirm all tests pass (329 unit tests pass; 1 pre-existing integration failure — test DB missing migrations, unrelated)
