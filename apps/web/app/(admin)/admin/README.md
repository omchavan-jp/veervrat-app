# admin

## Overview

Client admin dashboard renders translated navigation cards. [apps/web/app/(admin)/admin/page.tsx:AdminDashboardPage]

## Interface

- Default export AdminDashboardPage(); CARDS links to /admin/users, /admin/taxonomy, /admin/shlokas, /admin/pothi, /admin/resources, /admin/cms, /admin/featured, /admin/audit and /admin/suggestions. [apps/web/app/(admin)/admin/page.tsx:AdminDashboardPage]
- [audit](./audit/README.md): Client audit viewer renders action, timestamp, actor, resource, IP and optional JSON metadata. [apps/web/app/(admin)/admin/audit/page.tsx:AuditDashboardPage]
- [cms](./cms/README.md): Client CMS management panel lists pages and edits English/Marathi titles and bodies. [apps/web/app/(admin)/admin/cms/page.tsx:CmsPanel]
- [featured](./featured/README.md): Client curation panel lists blogs and public experiences and toggles featured status. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]
- [pothi](./pothi/README.md): Client panel lists Pothi sections with section numbers, English titles and shloka counts, with create/edit/delete controls. [apps/web/app/(admin)/admin/pothi/page.tsx:PothiPanel]
- [resources](./resources/README.md): Client panel lists resource titles, optional one-liners and types, with create/edit/delete controls. [apps/web/app/(admin)/admin/resources/page.tsx:ResourcesPanel]
- [shlokas](./shlokas/README.md): Client panel lists Devanagari shloka text and optional source citations, with create/edit/delete controls. [apps/web/app/(admin)/admin/shlokas/page.tsx:ShlokasPanel]
- [suggestions](./suggestions/README.md): Admin suggestion filtering and triage UI [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:AdminSuggestionsClient].
- [taxonomy](./taxonomy/README.md): Virtue listing, editing, creation and deletion panel [apps/web/app/(admin)/admin/taxonomy/page.tsx:TaxonomyPanel].
- [users](./users/README.md): Searchable user list linking to individual administration pages [apps/web/app/(admin)/admin/users/page.tsx:AdminUsersPage].

## Invariants

- Shows a loading spinner until useAdminGuard is ready and renders null for a ready non-admin. [apps/web/app/(admin)/admin/page.tsx:AdminDashboardPage]

## Side Effects

- Invokes imported useAdminGuard, which redirects loaded authenticated non-admin users to /dashboard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/page.tsx:AdminDashboardPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
