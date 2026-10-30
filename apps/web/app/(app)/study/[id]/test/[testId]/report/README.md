# report

## Overview

Client report renderer with virtues, flagged sentences and expandable other sentences. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:TestReportPage]

## Interface

- Default export TestReportPage uses useTestReport(testId); local SentenceCard accepts ReportSentence, index and weaknessId. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:TestReportPage] [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:SentenceCard] [apps/web/lib/api/tests.ts:ReportSentence]
- SentenceCard renders bilingual sentence, subvirtue/virtue metadata, optional score and link /journeys/new?sentenceId=${sentence.sentenceId}&weaknessId=${weaknessId}. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:SentenceCard]

## Invariants

- Sentence animation stagger is capped at six indices with 0.06-second steps; reduced motion disables sentence entry transform and delay. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:SentenceCard] [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:STAGGER_CAP] [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:STAGGER_STEP]
- Other sentences render only when present and expanded; absent/error report shows retry, loading shows spinner. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:TestReportPage]

## Side Effects

- Report hook fetches GET /tests/${testId}/report with enabled testId and infinite staleTime; retry calls refetch. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:TestReportPage] [apps/web/hooks/use-tests.ts:useTestReport] [apps/web/lib/api/tests.ts:testsApi.report]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
