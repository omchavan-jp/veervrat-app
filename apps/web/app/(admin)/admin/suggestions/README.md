# suggestions

## Overview

Admin suggestion filtering and triage UI [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:AdminSuggestionsClient].

## Interface

- Exports AdminSuggestionsClient; default AdminSuggestionsPage renders it and exports metadata title Content suggestions · Admin [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:AdminSuggestionsClient] [apps/web/app/(admin)/admin/suggestions/page.tsx:AdminSuggestionsPage] [apps/web/app/(admin)/admin/suggestions/page.tsx:metadata].
- Status filters and triage buttons enumerate NEW, TRIAGED, ACCEPTED, DECLINED, SHIPPED [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:STATUSES].

## Invariants

- Triage sends empty resolution, linkedCmsKey and linkedIssue as undefined; status buttons are disabled while the mutation is pending [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:TriageRow].
- Anchor display prefers anchorKey, then anchorText, then anchorPath [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:TriageRow].

## Side Effects

- Queries contentSuggestionsApi.list with optional status; triage calls contentSuggestionsApi.triage and invalidates the admin suggestions query prefix on success; failures add an error toast [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:AdminSuggestionsClient] [apps/web/app/(admin)/admin/suggestions/admin-suggestions-client.tsx:TriageRow].

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
