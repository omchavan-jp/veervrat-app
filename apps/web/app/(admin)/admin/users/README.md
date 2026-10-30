# users

## Overview

Searchable user list linking to individual administration pages [apps/web/app/(admin)/admin/users/page.tsx:AdminUsersPage].

## Interface

- Default export AdminUsersPage renders display name, username/email, role labels and anonymised/suspended badges [apps/web/app/(admin)/admin/users/page.tsx:AdminUsersPage] [apps/web/app/(admin)/admin/users/page.tsx:StatusBadge].
- [\[id\]](./%5Bid%5D/README.md): User detail administration with role/capability toggles, account actions, journey state overrides and activity lists [apps/web/app/(admin)/admin/users/[id]/page.tsx:AdminUserDetailPage].

## Invariants

- Query enabled only for isAdmin; ready non-admins render null; query text uses a 250 ms debounce; anonymised badge takes precedence over suspended badge [apps/web/app/(admin)/admin/users/page.tsx:AdminUsersPage] [apps/web/app/(admin)/admin/users/page.tsx:StatusBadge].

## Side Effects

- Fetches adminUsersApi.list using debounced search or undefined [apps/web/app/(admin)/admin/users/page.tsx:AdminUsersPage].
- useAdminGuard redirects loaded authenticated non-admins to /dashboard [apps/web/hooks/use-admin-guard.ts:useAdminGuard].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
