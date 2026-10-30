# experiences

## Overview

Public experience pool displaying excerpts, author links and tags. [apps/web/app/(content)/community/experiences/page.tsx:PublicExperiencesPage]

## Interface

- Default PublicExperiencesPage flattens cursor pages returned by experienceLogsApi.getPublic and links excerpts to /community/experiences/{id}. [apps/web/app/(content)/community/experiences/page.tsx:PublicExperiencesPage]
- [\[id\]](./%5Bid%5D/README.md): Experience reader delegates retrieval to experienceLogsApi.getOne. [apps/web/app/(content)/community/experiences/[id]/page.tsx:ExperienceDetailPage]

## Invariants

- Pagination continues from nextCursor; load-more disables while fetching. [apps/web/app/(content)/community/experiences/page.tsx:PublicExperiencesPage]

## Side Effects

- Invokes public pool query, retry refetch and fetchNextPage. [apps/web/app/(content)/community/experiences/page.tsx:PublicExperiencesPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
