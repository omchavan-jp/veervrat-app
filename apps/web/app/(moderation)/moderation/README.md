# moderation

## Overview

Moderation dashboard displays custom ERC pending count and a disabled reported-comments card [apps/web/app/(moderation)/moderation/page.tsx:ModerationDashboardPage].

## Interface

- Default export ModerationDashboardPage links to /moderation/custom-erc [apps/web/app/(moderation)/moderation/page.tsx:ModerationDashboardPage].
- [custom-erc](./custom-erc/README.md): Custom ERC queue selection and submission review UI [apps/web/app/(moderation)/moderation/custom-erc/page.tsx:CustomErcReviewPage].

## Invariants

- Queue fetching enabled only for MODERATOR or ADMIN; non-moderators render null after auth loading [apps/web/app/(moderation)/moderation/page.tsx:ModerationDashboardPage].

## Side Effects

- Queries moderationApi.getQueue and redirects authenticated non-moderators to /dashboard [apps/web/app/(moderation)/moderation/page.tsx:ModerationDashboardPage].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
