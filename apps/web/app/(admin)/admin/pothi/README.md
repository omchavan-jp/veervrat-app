# pothi

## Overview

Client panel lists Pothi sections with section numbers, English titles and shloka counts, with create/edit/delete controls. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]

## Interface

- Default export PothiPanel(); local Editing holds id, sectionNumber, titleEn, titleMr, introText, congregationResponse and postShlokaCommentary. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]

## Invariants

- List query enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]
- Save disabled for blank trimmed English title, falsy sectionNumber string or pending save; mutation converts sectionNumber with Number and trims text, omitting blank optional text. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]

## Side Effects

- Queries imported contentApi.pothiSections; save chooses imported adminApi.updatePothiSection versus createPothiSection by id; confirmed deletion calls deletePothiSection. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]
- Success closes corresponding editor/dialog, clears error and invalidates queryKeys.content.pothi; errors populate the alert. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
