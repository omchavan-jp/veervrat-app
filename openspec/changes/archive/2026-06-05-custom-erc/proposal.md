## Why

VA and VM can currently only work with pool ERC items (pre-seeded exposures, resolutions, challenges). The spec requires that both VA and VM can create custom ERC items within a journey at any time, and optionally submit them for global dataset inclusion via a moderator review pipeline. This is listed as a core flow in spec/decisions/03_flows.md and is blocked today.

## What Changes

- New `POST /api/v1/journeys/:id/exposures/custom` — VA or VM creates a custom exposure for a journey
- New `POST /api/v1/journeys/:id/resolutions/custom` — same for resolutions
- New `POST /api/v1/journeys/:id/challenges/custom` — same for challenges
- New `PATCH /api/v1/journeys/:id/exposures/:eid` — edit a custom ERC item before it is submitted (pre-submission only; `custom_erc.edit`)
- New `PATCH /api/v1/journeys/:id/resolutions/:eid` — same for resolutions
- New `PATCH /api/v1/journeys/:id/challenges/:eid` — same for challenges
- New `POST /api/v1/journeys/:id/exposures/:eid/submit-for-review` — submits a custom item to the moderator review queue; creates a `CustomErcReview` record
- Same submit-for-review endpoints for resolutions and challenges
- Schema addition: `createdById` column on `journey_exposures`, `journey_resolutions`, `journey_challenges` — required for ownership checks in `custom_erc.edit` and `custom_erc.delete`
- Schema addition: new `custom_erc_reviews` table for the moderator review queue
- Prisma migration: `add-custom-erc-creator-and-review-queue`

## Capabilities

### New Capabilities
- `custom-erc-create`: VA or VM creates a custom ERC item within a journey; item has `isCustom: true`, `poolExposureId: null`, `createdById` set to creator
- `custom-erc-edit`: Creator (VA or VM) edits a custom ERC item while it is in `NOT_STARTED` or `IN_PROGRESS` status (pre-submission); uses `custom_erc.edit` permission
- `custom-erc-submit-for-review`: VA or assigned VM submits a custom ERC to the moderator queue; creates `CustomErcReview` record with `status: pending`; fires `CUSTOM_ERC_REVIEW_REQUESTED` notification to moderators

### Modified Capabilities
- `erc-select`: `JourneyErcItem` type gains `createdById` field; list and detail responses now include it

## Impact

- **Schema**: two migrations — `createdById` column added to all three journey ERC tables; new `custom_erc_reviews` table
- **Repository** (`erc.repository.ts`): new `createCustomItem` method; new `updateCustomItem` method; existing select shapes gain `createdById`; new `CustomErcReviewsRepository` (separate file)
- **Service** (`erc.service.ts`): new `createCustomItem`, `editCustomItem`, `submitForReview` methods; `getJourneyAndCheckPermission` action union extended
- **Controller** (`erc.controller.ts`): 9 new endpoints (3 controllers × 3: create-custom, edit, submit-for-review); new DTOs
- **Tests** (`erc.service.spec.ts`): auth matrix tests for all new permissions
- No new dependencies
