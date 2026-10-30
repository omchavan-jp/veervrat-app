# resources

## Overview

Client panel lists resource titles, optional one-liners and types, with create/edit/delete controls. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]

## Interface

- Default export ResourcesPanel(); local Editing stores id, FILE | LINK type, url, thumbnailUrl, title, oneLiner and comma-separated looseTags; new resources default to LINK. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]

## Invariants

- List query enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]
- Save disabled for blank trimmed title or pending save; mutation trims title and optional text and parses comma-separated tags into trimmed nonempty strings. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]

## Side Effects

- Queries imported contentApi.resources; save chooses imported adminApi.updateResource versus createResource by id; confirmed deletion calls deleteResource. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]
- Success closes corresponding editor/dialog, clears error and invalidates queryKeys.content.resources(); errors populate the alert. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
