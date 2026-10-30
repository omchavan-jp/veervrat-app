# (admin)

## Overview

Wraps admin children with translation provider and shared authenticated app layout [apps/web/app/(admin)/layout.tsx:AdminLayout].

## Interface

- Default async AdminLayout accepts React children, loads getMessages and supplies messages to NextIntlClientProvider [apps/web/app/(admin)/layout.tsx:AdminLayout].
- [admin](./admin/README.md): Client admin dashboard renders translated navigation cards. [apps/web/app/(admin)/admin/page.tsx:AdminDashboardPage]

## Invariants

- Delegated AppLayoutClient renders null without authenticated user or completed onboarding [apps/web/app/(app)/layout-client.tsx:AppLayoutClient].

## Side Effects

- Delegated AppLayoutClient invalidates auth.me on changed pathname, redirects unauthenticated users to /login and users with incomplete onboarding to /onboarding [apps/web/app/(app)/layout-client.tsx:AppLayoutClient].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
