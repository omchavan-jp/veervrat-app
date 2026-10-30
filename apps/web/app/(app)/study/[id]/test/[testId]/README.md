# [testId]

## Overview

Client question-answering page with one-question and all-question views. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage]

## Interface

- Default export TestQuestionPage reads id and testId route parameters, weakness content through useWeakness and saved answers through useTest. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage] [apps/web/hooks/use-weaknesses.ts:useWeakness] [apps/web/hooks/use-tests.ts:useTest]
- Score type is 1 | 2 | 3 | 4; SCORE_KEYS maps 4/3/2/1 to always/often/sometimes/never. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:Score] [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:SCORE_KEYS]
- Uses imported BilingualText for sentence content; locale-dependent ordering belongs to that component. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage] [apps/web/components/shared/bilingual-text.tsx:BilingualText]
- [preview](./preview/README.md): Client review and submission page partitioning sentences by saved answers. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage]
- [report](./report/README.md): Client report renderer with virtues, flagged sentences and expandable other sentences. [apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx:TestReportPage]

## Invariants

- Hydrates answers once from testData using hydrated; submitted tests replace the route with /study/${id}/test/${testId}/report. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage]
- Score selection clears an existing answer when the toggle group is empty; auto-next requires advance, a non-null selection, and autoNext, with an upper index bound. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:handleScoreSelect]
- Review button disables with zero answers or pending save; answers persist only for nonempty payloads. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage] [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:persistAnswers]
- beforeunload registration requires dirty draft; popstate guard requires hydrated draft and checks dirtyRef. Anchor interception outside the test prefix does not check dirty. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage]

## Side Effects

- Reads/writes localStorage key veervrat.study.autoNext, catching storage errors. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:AUTO_NEXT_STORAGE_KEY] [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:toggleAutoNext]
- Debounces saves by 600ms and calls useSaveAnswers; imported hook delegates PATCH /tests/${testId}/answers to testsApi.saveAnswers. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:persistAnswers] [apps/web/hooks/use-tests.ts:useSaveAnswers] [apps/web/lib/api/tests.ts:testsApi.saveAnswers]
- Registers capture click, beforeunload and popstate listeners with cleanup; pushes history sentinel entries and may invoke history.back. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage]
- flushAndNavigate clears pending debounce, saves current nonempty answers, invalidates tests.detail and pushes destination on settlement including errors; save failures toast using errorMessage. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:flushAndNavigate] [apps/web/lib/api/error-message.ts:errorMessage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
