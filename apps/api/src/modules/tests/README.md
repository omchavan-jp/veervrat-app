# tests

## Overview

Manages weakness test drafts, answers, submission and reports. [tests.service.ts:TestsService]

## Interface

- Session-protected tests endpoints create or resume drafts, save answers, submit, retrieve an attempt and retrieve its report. [tests.controller.ts:TestsController]
- Exports TestsService through TestsModule; repository provides attempt, answer and report data access. [tests.module.ts:TestsModule] [tests.repository.ts:TestsRepository]
- [dto](./dto/README.md): Defines test creation and answer request validation.

## Invariants

- Attempt retrieval, answer saving and submission require the owner; saving and submission require a draft. [tests.service.ts:getTest] [tests.service.ts:saveAnswers] [tests.service.ts:submitTest]
- Reports require an owner or a user authorized by test.view_results and reject drafts; scores at most 2 are flagged and sorted ascending. [tests.service.ts:assertCanViewResults] [tests.service.ts:getReport]
- Creating an attempt resumes an existing draft for the same user and weakness if found. [tests.service.ts:createOrResumeDraft]
- Draft creation uses the session user ID without checking test.take or VA role. Saving answers does not check sentence membership in the weakness, and submission does not require all sentences to be answered. [tests.controller.ts:create] [tests.service.ts:createOrResumeDraft] [tests.service.ts:saveAnswers] [tests.service.ts:submitTest] [tests.repository.ts:upsertAnswers]

## Side Effects

- Creates drafts, transactionally upserts answers and marks attempts submitted with a timestamp through Prisma. [tests.repository.ts:createDraft] [tests.repository.ts:upsertAnswers] [tests.repository.ts:markSubmitted]
- Reads attempts, weakness sentences, answer counts and relationship context. [tests.repository.ts:findReportData] [tests.service.ts:buildOwnerVmContext]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
