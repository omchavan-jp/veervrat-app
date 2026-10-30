# (moderation)

## Overview

Layout composes translation provider with imported shared AppLayoutClient. [apps/web/app/(moderation)/layout.tsx:ModerationLayout]

## Interface

- Default async ModerationLayout accepts children and imports AppLayoutClient from ../(app)/layout-client. [apps/web/app/(moderation)/layout.tsx:ModerationLayout]
- [moderation](./moderation/README.md): Moderation dashboard displays custom ERC pending count and a disabled reported-comments card [apps/web/app/(moderation)/moderation/page.tsx:ModerationDashboardPage].

## Invariants

- Delegated AppLayoutClient renders null without an authenticated user or with incomplete onboarding [apps/web/app/(app)/layout-client.tsx:AppLayoutClient].

## Side Effects

- Loads translated messages with getMessages. [apps/web/app/(moderation)/layout.tsx:ModerationLayout]
- Delegated AppLayoutClient invalidates auth.me on changed pathname, redirects unauthenticated users to /login and users with incomplete onboarding to /onboarding [apps/web/app/(app)/layout-client.tsx:AppLayoutClient].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
