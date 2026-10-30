# cms

## Overview

Client CMS management panel lists pages and edits English/Marathi titles and bodies. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]

## Interface

- Default export CmsPanel() provides new-page, edit, save and confirmed-delete controls; uses imported cmsApi and text/Tiptap converters. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]

## Invariants

- List query enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]
- Existing page key input is disabled; save is disabled for blank trimmed key, English title or English body, or pending save. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]
- Mutation payload trims keys/titles, converts body text through textToTiptapDoc, and omits blank Marathi fields. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]

## Side Effects

- Queries cmsApi.list; save calls cmsApi.upsert and confirmed deletion calls cmsApi.remove. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]
- Successful saves/deletes clear corresponding editor/dialog and errors, then invalidate queryKeys.cms.list; mutation errors populate the alert. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
