# test

## Overview

Client test creation/resumption entry page. [apps/web/app/(app)/study/[id]/test/page.tsx:TestEntryPage]

## Interface

- Default export TestEntryPage reads id route parameter and invokes useCreateTest. [apps/web/app/(app)/study/[id]/test/page.tsx:TestEntryPage]
- [\[testId\]](./%5BtestId%5D/README.md): Client question-answering page with one-question and all-question views. [apps/web/app/(app)/study/[id]/test/[testId]/page.tsx:TestQuestionPage]

## Invariants

- Effect starts on id changes; creation errors render retry and other states show creating spinner. [apps/web/app/(app)/study/[id]/test/page.tsx:TestEntryPage]

## Side Effects

- start mutates weakness id and replaces route /study/${id}/test/${test.id} on success; imported API sends POST /tests with weaknessId. [apps/web/app/(app)/study/[id]/test/page.tsx:start] [apps/web/hooks/use-tests.ts:useCreateTest] [apps/web/lib/api/tests.ts:testsApi.createOrResume]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
