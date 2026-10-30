# moderation

## Overview

Display-content controller exposes audited feature toggles. [display-content.controller.ts:DisplayContentController]

## Interface

- Session-protected PATCH routes set featured state for blogs and experiences. [display-content.controller.ts:featureBlog] [display-content.controller.ts:featureExperience]
- Session-protected routes list and inspect the queue and approve or reject submissions; mutations carry audit metadata. [moderation.controller.ts:ModerationController]
- DisplayContentService sets blog or experience featured state. [display-content.service.ts:DisplayContentService]
- [dto](./dto/README.md): DTOs validate moderator edits, rejection reasons and featured flags.

## Invariants

- Both routes require SessionGuard and attach audit action, resource ID and featured metadata. [display-content.controller.ts:DisplayContentController]
- Review operations require moderator.review_custom_erc; decisions require pending review, and rejection requires a nonblank reason. [moderation.service.ts:assertModerator] [moderation.service.ts:approve] [moderation.service.ts:reject]
- Pending reviews are FIFO, cursor-paginated; detail exposes journey ID/title, sentence, subvirtue, virtue and weakness information. [moderation.repository.ts:listPending] [moderation.repository.ts:findReviewDetail]
- Feature changes require moderator.manage_display_content and existing non-deleted content. [display-content.service.ts:assert] [moderation.repository.ts:findBlog] [moderation.repository.ts:findExperienceLog]

## Side Effects

- Delegates featured state changes to DisplayContentService and marks the operations for auditing. [display-content.controller.ts:featureBlog] [display-content.controller.ts:featureExperience]
- Approval optionally edits the custom item, creates a pool item with journey sentence and weakness tags in a transaction with review approval, updates item review status and notifies the submitter. Rejection records reason, updates item status and notifies. [moderation.service.ts:approve] [moderation.repository.ts:approveAndPromote] [moderation.service.ts:reject]
- Featured flags are persisted via Prisma. [moderation.repository.ts:setBlogFeatured] [moderation.repository.ts:setExperienceLogFeatured]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
