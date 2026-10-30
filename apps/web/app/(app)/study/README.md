# study

## Overview

Client weakness browser grouped by returned clusters. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage]

## Interface

- Default export StudyBrowserPage loads useWeaknesses and renders cluster labels, bilingual weakness names, descriptions, optional tests/journey stats, and /study/${w.id} links. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage]
- WhyModal is imported from components/study and delegates to CmsInfoModal using cmsKey why-weaknesses. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage] [apps/web/components/study/why-modal.tsx:WhyModal]
- [\[id\]](./%5Bid%5D/README.md): Client weakness detail page showing names, description, subvirtues, test history, and test navigation. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage]

## Invariants

- Missing data becomes empty clusters; QueryBoundary receives loading/error/empty flags, retry, six skeleton cards and EmptyState. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage] [apps/web/components/ui/query-boundary.tsx:QueryBoundary]

## Side Effects

- useWeaknesses delegates GET /weaknesses and configures a five-minute staleTime; retry invokes refetch. [apps/web/app/(app)/study/page.tsx:StudyBrowserPage] [apps/web/hooks/use-weaknesses.ts:useWeaknesses] [apps/web/lib/api/weaknesses.ts:weaknessesApi.list]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
