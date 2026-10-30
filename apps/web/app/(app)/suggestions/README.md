# suggestions

## Overview

Suggestion history page and client list renderer. [apps/web/app/(app)/suggestions/page.tsx:MySuggestionsPage] [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient]

## Interface

- page.tsx exports metadata title My suggestions and default MySuggestionsPage rendering named export MySuggestionsClient. [apps/web/app/(app)/suggestions/page.tsx:metadata] [apps/web/app/(app)/suggestions/page.tsx:MySuggestionsPage] [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient]
- Client renders titleEn, translated kind/route, StatusPill, bodyEn converted by docToText, optional resolution, formatted creation date and stored s.url link. [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient] [apps/web/lib/suggestions/body.ts:docToText] [apps/web/components/shared/suggestions/status-pill.tsx:StatusPill]

## Invariants

- Uses query key content-suggestions/mine/all and defaults items to []; empty state requires no loading/error and zero items. [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient]

## Side Effects

- Query calls contentSuggestionsApi.mine without scope; that API owns GET /content-suggestions/mine. [apps/web/app/(app)/suggestions/my-suggestions-client.tsx:MySuggestionsClient] [apps/web/lib/api/content-suggestions.ts:contentSuggestionsApi.mine]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
