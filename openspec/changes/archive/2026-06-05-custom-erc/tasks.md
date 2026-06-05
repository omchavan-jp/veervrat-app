## 1. Schema — Migration

- [x] 1.1 Add `createdById String? @map("created_by_id") @db.Uuid` to `JourneyExposure`, `JourneyResolution`, `JourneyChallenge` in `schema.prisma`
- [x] 1.2 Add `CustomErcReview` model to `schema.prisma` with fields: `id`, `journeyExposureId?`, `journeyResolutionId?`, `journeyChallengeId?`, `entityType ErcEntityType`, `submittedById String`, `status String @default("pending")`, `reviewedById String?`, `reviewedAt DateTime?`, `reviewNote String?`, `createdAt`, `updatedAt`
- [x] 1.3 Run `pnpm --filter api prisma migrate dev --name add-custom-erc-creator-and-review-queue` to generate and apply the migration

## 2. Repository — ERC (erc.repository.ts)

- [x] 2.1 Add `createdById` to `JourneyErcItem` type
- [x] 2.2 Update `listJourneyItems` selects for all 3 types to include `createdById`
- [x] 2.3 Update `findById` selects for all 3 types to include `createdById`
- [x] 2.4 Add `createCustomItem(journeyId, createdById, data, ercType): Promise<JourneyErcItem>` to `ErcRepository` — creates with `isCustom: true`, no pool FK, `createdById` set
- [x] 2.5 Add `updateCustomItem(id, data, ercType): Promise<JourneyErcItem>` to `ErcRepository` — updates editable fields (`titleEn`, `descriptionEn`, type-specific fields)
- [x] 2.6 Add `setReviewStatus(id, reviewStatus: string, ercType): Promise<JourneyErcItem>` to `ErcRepository` — updates `reviewStatus` field only

## 3. Repository — Custom ERC Reviews (new file)

- [x] 3.1 Create `apps/api/src/modules/erc/custom-erc-reviews.repository.ts` with `CustomErcReviewsRepository` injectable
- [x] 3.2 Add `create(data: { journeyExposureId? | journeyResolutionId? | journeyChallengeId?, entityType, submittedById }): Promise<{ id: string }>` method

## 4. Service — erc.service.ts

- [x] 4.1 Inject `CustomErcReviewsRepository` into `ErcService` constructor
- [x] 4.2 Extend `getJourneyAndCheckPermission` action union to include `'custom_erc.create'` and `'custom_erc.submit_for_review'`
- [x] 4.3 Add `createCustomItem(user, journeyId, data, ercType)` — checks `custom_erc.create`, calls `ercRepository.createCustomItem`
- [x] 4.4 Add `editCustomItem(user, journeyId, itemId, data, ercType)` — fetches item, checks `isCustom`, checks `custom_erc.edit` using real `item.createdById`, calls `ercRepository.updateCustomItem`
- [x] 4.5 Add `submitForReview(user, journeyId, itemId, ercType)` — checks `custom_erc.submit_for_review`, fetches item, guards `isCustom` and `reviewStatus !== 'pending'`, calls `setReviewStatus('pending')` + `customErcReviewsRepository.create`, fires `CUSTOM_ERC_REVIEW_REQUESTED` notification

## 5. DTOs

- [x] 5.1 Create `apps/api/src/modules/erc/dto/create-custom-erc.dto.ts` — shared base DTO with `titleEn: string`, `descriptionEn?: string`
- [x] 5.2 Create `apps/api/src/modules/erc/dto/create-custom-exposure.dto.ts` — extends base, adds `tier: ExposureTier`
- [x] 5.3 Create `apps/api/src/modules/erc/dto/create-custom-resolution.dto.ts` — extends base, adds `durationWeeks?`, `frequencyPerWeek?`, `frequencyLabel?`
- [x] 5.4 Create `apps/api/src/modules/erc/dto/create-custom-challenge.dto.ts` — extends base, adds `durationDays?`
- [x] 5.5 Create `apps/api/src/modules/erc/dto/edit-custom-erc.dto.ts` — all fields optional (partial update), same shape as create but all `@IsOptional()`

## 6. Controller — erc.controller.ts

- [x] 6.1 Add `POST :custom` endpoint to `ExposuresController` → `ercService.createCustomItem(u, j, dto, 'exposure')` (201)
- [x] 6.2 Add `PATCH :itemId` endpoint to `ExposuresController` → `ercService.editCustomItem(u, j, i, dto, 'exposure')` (200)
- [x] 6.3 Add `POST :itemId/submit-for-review` endpoint to `ExposuresController` → `ercService.submitForReview(u, j, i, 'exposure')` (200)
- [x] 6.4 Same 3 endpoints to `ResolutionsController`
- [x] 6.5 Same 3 endpoints to `ChallengesController`

## 7. Module — erc.module.ts

- [x] 7.1 Register `CustomErcReviewsRepository` in `providers` array of `ErcModule`

## 8. Tests — erc.service.spec.ts

- [x] 8.1 Add `createCustomItem` mock to `makeRepo()` factory; extend `makeItem()` to include `createdById` field
- [x] 8.2 Add `updateCustomItem`, `setReviewStatus` mocks to `makeRepo()`
- [x] 8.3 Add `makeCustomErcReviewsRepo()` factory with `create` mock; add to `makeService()`
- [x] 8.4 `createCustomItem` suite: VA positive (item created with createdById=VA.id), VM-assigned positive, non-owner VA → 403, non-assigned VM → 403
- [x] 8.5 `editCustomItem` suite: creator VA positive, creator VM positive, non-creator → 403, pool item (isCustom=false) → 403, post-submission status → 403
- [x] 8.6 `submitForReview` suite: VA positive (review record created + reviewStatus set + notification), assigned VM positive, non-participant → 403, pool item → 403, already-pending → 409
