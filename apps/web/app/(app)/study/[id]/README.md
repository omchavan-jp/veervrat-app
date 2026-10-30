# [id]

## Overview

Client weakness detail page showing names, description, subvirtues, test history, and test navigation. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage]

## Interface

- Default export WeaknessDetailPage reads id from useParams, consumes useWeakness(id), renders BilingualText/ContentText and WhyModal, and links back to /study. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage]
- History links target /study/${id}/test/${test.id}/report; the primary action targets existing draft /study/${id}/test/${draftTestId} when present or /study/${id}/test otherwise. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage]
- [test](./test/README.md): Client test creation/resumption entry page. [apps/web/app/(app)/study/[id]/test/page.tsx:TestEntryPage]

## Invariants

- Loading, error with retry, and missing data have distinct render branches; subvirtues are shown only when nonempty and dates use the locale formatter. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage]
- The imported useWeakness query is enabled only for a truthy id and uses a five-minute staleTime; its owner calls weaknessesApi.detail. [apps/web/hooks/use-weaknesses.ts:useWeakness]

## Side Effects

- Imported useWeakness issues weakness detail retrieval through weaknessesApi.detail (GET /weaknesses/${id}); retry invokes refetch. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage] [apps/web/hooks/use-weaknesses.ts:useWeakness] [apps/web/lib/api/weaknesses.ts:weaknessesApi.detail]
- WhyModal passes CMS key why-weaknesses to CmsInfoModal; the modal enables its CMS query when opened and uses localized fallback copy when content is absent. [apps/web/app/(app)/study/[id]/page.tsx:WeaknessDetailPage] [apps/web/components/study/why-modal.tsx:WhyModal] [apps/web/components/shared/cms-info-modal.tsx:CmsInfoModal]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
