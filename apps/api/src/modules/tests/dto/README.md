# dto

## Overview

Defines test creation and answer request validation. [create-test.dto.ts:CreateTestDto] [save-answers.dto.ts:SaveAnswersDto]

## Interface

- CreateTestDto accepts a weakness ID; SaveAnswersDto accepts an array of sentence IDs and scores. [create-test.dto.ts:CreateTestDto] [save-answers.dto.ts:SaveAnswersDto]

## Invariants

- Weakness and sentence IDs must be UUIDs; each answer score must be one of 1, 2, 3 or 4. [create-test.dto.ts:CreateTestDto] [save-answers.dto.ts:AnswerItemDto]

## Side Effects

- Defines validation and nested transformation metadata. [create-test.dto.ts:CreateTestDto] [save-answers.dto.ts:SaveAnswersDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
