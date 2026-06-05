## Context

Pool ERC items (Exposure, Resolution, Challenge) are pre-seeded global content. Journey ERC models (`JourneyExposure`, `JourneyResolution`, `JourneyChallenge`) already carry a `poolExposureId`/etc. nullable FK and an `isCustom: boolean` flag — the schema is already designed for custom items. What is missing is: (1) the `createdById` column on all three journey ERC tables so ownership-based permission checks (`custom_erc.edit`, `custom_erc.delete`) work, (2) a `CustomErcReview` table for the moderator queue, (3) the service/controller/repository layer that wires create/edit/submit-for-review.

`has-permission.ts` already implements all four `custom_erc.*` permission actions correctly — no changes needed there.

`NotificationEventType` already includes `CUSTOM_ERC_REVIEW_REQUESTED`, `CUSTOM_ERC_APPROVED`, `CUSTOM_ERC_REJECTED` — no schema enum changes needed for notifications.

## Goals / Non-Goals

**Goals:**
- VA and VM can create custom ERC items within a journey (`isCustom: true`, no pool FK)
- Creator can edit their own custom item while it is in `NOT_STARTED` or `IN_PROGRESS` status
- VA or assigned VM can submit any custom item in the journey for global review (`CustomErcReview` record created, status `pending`)
- Moderator review queue is populated by submit-for-review; moderator actions (approve/reject) are a separate item
- Auth matrix fully enforced: non-creator cannot edit; non-participant cannot submit; pool items cannot be edited via custom-erc edit endpoint

**Non-Goals:**
- Moderator approve/reject actions (separate implementation item)
- `custom_erc.delete` endpoint (not in item 17 scope)
- Frontend UI (backend only per item 17)
- Duplicate detection logic (deferred per spec/decisions/03_flows.md open question)

## Decisions

### D1 — Add `createdById` to journey ERC tables via migration

`custom_erc.edit` checks `erc.createdById === user.id`. Without this column, ownership checks cannot be performed. The column is nullable to allow backfilling existing pool-sourced rows (which have no creator in this sense). New custom items always set it.

**Alternative considered**: derive creator from audit log. Rejected — adds complexity for a simple ownership check.

### D2 — Separate `CustomErcReviewsRepository`

The review queue is a new concern. It lives in a new file `custom-erc-reviews.repository.ts` inside the `erc/` module, keeping Prisma access properly layered. The `ErcService` calls it for `submitForReview`. The `ErcModule` registers it.

**Alternative**: put it in a separate `moderation` module. Rejected for item 17 scope — moderator-side actions (approve/reject) live in moderation; the submission side belongs with ERC.

### D3 — `createCustomItem` mirrors `selectPoolItem` but with `isCustom: true`, no pool FK, `createdById`

Custom items start at `NOT_STARTED` status (same lifecycle as pool items). The `ErcService.createCustomItem` calls `ErcRepository.createCustomItem` — no new repository method signature surprises.

### D4 — Edit endpoint is `PATCH /:eid` (same URL as no existing PATCH on item-level)

Currently only `PATCH :itemId/status` exists. `PATCH :itemId` (no sub-path) is available and semantically correct for editing the item itself. Guards: `isCustom: true` check in service (pool items cannot be edited via this endpoint), `custom_erc.edit` permission check (creator + pre-submission status).

### D5 — Submit-for-review creates `CustomErcReview` with `pending` status; `reviewStatus` field on journey ERC is updated to `'pending'`

The `JourneyExposure.reviewStatus String?` column already exists. Setting it to `'pending'` marks the item as "in review" so it can be filtered/displayed. The `CustomErcReview` table holds full review context for moderators per spec/decisions/17_moderation.md.

### D6 — `createdById` in `getJourneyAndCheckPermission` for custom_erc.edit

The helper currently passes a dummy `erc: { journeyId, createdById: user.id, status: NOT_STARTED }`. For `custom_erc.edit`, the permission check uses `erc.createdById === user.id` — so the helper must receive the real item's `createdById`. The existing helper is augmented with a `customErcCreatedById` optional override that is passed for edit operations.

**Alternative**: separate helper for custom ERC permission checks. Rejected — it would duplicate the journey fetch logic.

## Risks / Trade-offs

- **Nullable `createdById`**: Existing pool-sourced journey ERC rows will have `createdById: null`. The edit endpoint must guard `item.isCustom === true` before checking `createdById` to avoid null mismatches. Service enforces this.
- **Migration on live data**: `createdById` is nullable with no default — safe to add to existing rows without backfill. Migration is non-destructive.
- **`reviewStatus` as `String?`**: Already in schema as a plain string rather than a typed enum. Acceptable for v1; a proper enum migration can be done when the moderator approve/reject side is built.
- **No transaction between ERC update and notification**: Same pattern as existing suggest/approve flows. Acceptable for v1.
