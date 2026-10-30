# profile

## Overview

Client page for the current account profile and profile visibility controls. [apps/web/app/(app)/profile/page.tsx:ProfilePage]

## Interface

- Default export ProfilePage queries usersApi.getMyProfile with cache key ["profile","me"], renders account identity and optional follow counts, and links to /settings and /u/${p.username}. [apps/web/app/(app)/profile/page.tsx:ProfilePage]
- FIELDS defines the ten per-field switches using ProfileField imported from lib/api/users. [apps/web/app/(app)/profile/page.tsx:FIELDS]

## Invariants

- A visibility field is considered visible unless explicitly false; per-field switches are disabled while the profile is private or the visibility mutation is pending. [apps/web/app/(app)/profile/page.tsx:ProfilePage]
- Loading shows a spinner; error or absent profile shows a retry action. [apps/web/app/(app)/profile/page.tsx:ProfilePage]

## Side Effects

- Changing a switch calls usersApi.updateVisibility, whose owner PATCHes /users/me/visibility through the API client; success replaces the local profile query data and shows a toast, and failure shows a destructive toast. [apps/web/app/(app)/profile/page.tsx:ProfilePage] [apps/web/lib/api/users.ts:usersApi.updateVisibility]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
