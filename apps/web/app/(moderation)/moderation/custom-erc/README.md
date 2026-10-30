# custom-erc

## Overview

Custom ERC queue selection and submission review UI [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:CustomErcReviewPage].

## Interface

- Default export CustomErcReviewPage; internal ReviewDetail receives ModReviewDetail, busy, onApprove and onReject callbacks [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:CustomErcReviewPage] [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:ReviewDetail].

## Invariants

- Queue query enabled only for MODERATOR or ADMIN; non-moderators render null after auth loading; detail query requires selectedId [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:CustomErcReviewPage].
- Reject confirmation requires a nonempty trimmed reason; action buttons disabled while busy; Marathi content falls back to English [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:ReviewDetail].

## Side Effects

- Redirects resolved authenticated non-moderators to /dashboard; queries moderationApi.getQueue/getDetail; approve/reject mutations invalidate queue and clear selection on success, with translated success/error toasts [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:CustomErcReviewPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
