# taxonomy

## Overview

Virtue listing, editing, creation and deletion panel [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].

## Interface

- Default export TaxonomyPanel uses virtuesApi.list and adminApi createVirtue/updateVirtue/deleteVirtue [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].

## Invariants

- Virtue query is enabled only when isAdmin; ready non-admins render null; save is disabled for blank trimmed English name or a pending save [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].
- Save trims names/description and omits empty Marathi name/description; deletion is submitted from the confirmation Dialog [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].

## Side Effects

- Save/remove mutations invalidate queryKeys.virtues.list on success and expose mutation errors in local alert state [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].
- useAdminGuard redirects loaded authenticated non-admins to /dashboard [apps/web/hooks/use-admin-guard.ts:useAdminGuard].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
