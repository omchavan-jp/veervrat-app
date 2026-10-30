# dto

## Overview

Validation DTOs define ERC selection, custom content, status, suggestions and check-ins. [select-erc.dto.ts:SelectErcDto] [create-custom-erc.dto.ts:CreateCustomErcDto] [update-erc-status.dto.ts:UpdateErcStatusDto] [suggest-erc.dto.ts:SuggestErcDto] [create-checkin.dto.ts:CreateCheckinDto]

## Interface

- Custom exposure requires a tier; resolution and challenge duration/frequency fields are optional positive integers; edits allow optional type-specific fields. [create-custom-exposure.dto.ts:CreateCustomExposureDto] [create-custom-resolution.dto.ts:CreateCustomResolutionDto] [create-custom-challenge.dto.ts:CreateCustomChallengeDto] [edit-custom-erc.dto.ts:EditCustomErcDto]

## Invariants

- Pool ID must be a UUID; suggestion text is nonempty and at most 500 characters; check-in status is an enum and optional note is at most 500 characters. [select-erc.dto.ts:SelectErcDto] [suggest-erc.dto.ts:SuggestErcDto] [create-checkin.dto.ts:CreateCheckinDto]

## Side Effects

- Defines validation metadata without persistence. [create-custom-erc.dto.ts:CreateCustomErcDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
