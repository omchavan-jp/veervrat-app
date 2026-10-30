# dto

## Overview

Feedback DTOs validate reporting, pagination and status changes. [create-feedback.dto.ts:CreateFeedbackDto] [list-feedback.query.dto.ts:ListFeedbackQueryDto] [update-feedback.dto.ts:UpdateFeedbackDto]

## Interface

- Create accepts type, title and optional bounded description and diagnostics; list supports cursor, page size and includeResolved. [create-feedback.dto.ts:CreateFeedbackDto] [list-feedback.query.dto.ts:ListFeedbackQueryDto]

## Invariants

- Page size is 1–100; status update allows TRIAGED, DONE or DECLINED and requires the corresponding nonempty bounded note for DONE or DECLINED. [list-feedback.query.dto.ts:ListFeedbackQueryDto] [update-feedback.dto.ts:UpdateFeedbackDto]

## Side Effects

- Defines validation and query transformation metadata. [list-feedback.query.dto.ts:ListFeedbackQueryDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
