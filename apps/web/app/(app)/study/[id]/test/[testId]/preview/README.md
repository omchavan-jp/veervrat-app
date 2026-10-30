# preview

## Overview

Client review and submission page partitioning sentences by saved answers. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage]

## Interface

- Default export TestPreviewPage consumes id/testId, useWeakness, useTest and useSubmitTest; answered sentences are visible and unanswered sentences use Collapsible. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage]
- Local Score union is 1 | 2 | 3 | 4 and Sentence contains sentenceId, textEn, nullable textMr. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:Score] [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:Sentence]

## Invariants

- Already submitted test redirects to report unless submission is pending. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage]
- Completion is disabled for pending submission or zero answered sentences; unanswered sentences require confirmation before doSubmit. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage] [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:handleConfirm]

## Side Effects

- doSubmit invokes useSubmitTest with testId, pushes report on success and emits destructive toast on error. Hook invalidates tests.detail; API owns POST /tests/${testId}/submit. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:doSubmit] [apps/web/hooks/use-tests.ts:useSubmitTest] [apps/web/lib/api/tests.ts:testsApi.submit]
- Edit controls push /study/${id}/test/${testId}. [apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx:TestPreviewPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
