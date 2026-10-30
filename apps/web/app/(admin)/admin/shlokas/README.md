# shlokas

## Overview

Client panel lists Devanagari shloka text and optional source citations, with create/edit/delete controls. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]

## Interface

- Default export ShlokasPanel(); local Editing stores id, devanagariText, transliteration, meaningEn, meaningMr, sourceCitation and comma-separated looseTags. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]

## Invariants

- List query enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]
- Save disabled for blank trimmed Devanagari text or pending save; mutation trims text, omits blank optional strings and parses tags into trimmed nonempty strings. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]

## Side Effects

- Queries imported contentApi.shlokas; save chooses imported adminApi.updateShloka versus createShloka by id; confirmed deletion calls deleteShloka. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]
- Success closes corresponding editor/dialog, clears error and invalidates queryKeys.content.shlokas(); errors populate the alert. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
