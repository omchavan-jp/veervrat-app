# erc

## Overview

Journey exposures, resolutions and challenges have session-protected endpoints and Prisma persistence for pool selections, custom items, reviews and mentor sidenotes. [erc.controller.ts:ExposuresController] [erc.controller.ts:ResolutionsController] [erc.controller.ts:ChallengesController] [erc.repository.ts:ErcRepository]

## Interface

- Each journey ERC controller delegates pool and list, select and custom creation, editing, review submission, status, approval, revisit, suggestion and removal, sidenote acknowledgement, activation and deletion to ErcService. [erc.controller.ts:ExposuresController] [erc.controller.ts:ResolutionsController] [erc.controller.ts:ChallengesController]
- ErcModule registers ERC and resolution check-in controllers, services and repositories and exports ErcService and ErcRepository. [erc.module.ts:ErcModule]
- ErcRepository exposes pool and journey item queries, item mutations and sidenote operations; CustomErcReviewsRepository creates a review. [erc.repository.ts:ErcRepository] [custom-erc-reviews.repository.ts:create]
- ErcService handles pool selection, lifecycle, custom reviews and mentor sidenotes. [erc.service.ts:ErcService]
- Session-protected resolution check-in endpoints create and list records. [resolution-checkins.controller.ts:ResolutionCheckinsController]
- [dto](./dto/README.md): Validation DTOs define ERC selection, custom content, status, suggestions and check-ins.

## Invariants

- Pool candidates match any journey weakness and exclude already selected noncustom pool items, including deactivated items; no weaknesses yields an empty pool. [erc.repository.ts:getPool]
- Selecting a pool item snapshots its text and type-specific fields; a missing pool item throws EntityNotFoundException. [erc.repository.ts:selectPoolItem]
- Lists and lookups include only non-revoked sidenotes; upsert clears revocation and acknowledgement, while revoke clears acknowledgement. [erc.repository.ts:listJourneyItems] [erc.repository.ts:sidenoteRelationSelect] [erc.repository.ts:upsertSidenote] [erc.repository.ts:revokeSidenote]
- Status updates stamp the corresponding started, submitted or approved time without clearing other timestamps. [erc.repository.ts:updateStatus]
- Transitions are NOT_STARTED to IN_PROGRESS to SUBMITTED, then APPROVED or REVISIT; deactivated items cannot transition and PATCH cannot set REVISIT. [erc.service.ts:updateStatus]
- Custom definitions require a null review status to edit or submit, and items must belong to the specified journey. [erc.service.ts:editCustomItem] [erc.service.ts:submitForReview]
- Check-ins require selection permission and an active IN_PROGRESS resolution; listing requires journey view. Streak counts consecutive DONE records from the latest record, not calendar days. [resolution-checkins.service.ts:logCheckin] [resolution-checkins.service.ts:listCheckins] [resolution-checkins.repository.ts:listWithStreak]

## Side Effects

- Prisma reads and creates, updates or deletes journey items and review records. [erc.repository.ts:ErcRepository] [custom-erc-reviews.repository.ts:create]
- Sidenote upsert, revocation and acknowledgement write records and use current time for revocation and acknowledgement. [erc.repository.ts:upsertSidenote] [erc.repository.ts:revokeSidenote] [erc.repository.ts:acknowledgeSidenote]
- Selection, status, custom review, activation and sidenote operations write through repositories; submission, approval, revisit and suggestions create notifications. [erc.service.ts:selectItem] [erc.service.ts:updateStatus] [erc.service.ts:submitForReview] [erc.service.ts:approveItem] [erc.service.ts:revisitItem] [erc.service.ts:suggestItem] [erc.service.ts:unsuggestItem]
- Check-ins are created and listed through Prisma. [resolution-checkins.repository.ts:create] [resolution-checkins.repository.ts:listWithStreak]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
