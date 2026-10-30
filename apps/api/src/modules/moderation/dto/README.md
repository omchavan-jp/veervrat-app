# dto

## Overview

DTOs validate moderator edits, rejection reasons and featured flags. [approve-custom-erc.dto.ts:ApproveCustomErcDto] [reject-custom-erc.dto.ts:RejectCustomErcDto] [set-featured.dto.ts:SetFeaturedDto]

## Interface

- Approval may include nested edits; rejection requires reason and featured changes require a boolean. [approve-custom-erc.dto.ts:CustomErcEditsDto] [reject-custom-erc.dto.ts:RejectCustomErcDto] [set-featured.dto.ts:SetFeaturedDto]

## Invariants

- Numeric edit durations and frequency are integers of at least one; rejection reason is 1–1000 characters. [approve-custom-erc.dto.ts:CustomErcEditsDto] [reject-custom-erc.dto.ts:RejectCustomErcDto]

## Side Effects

- Defines validation and transformation metadata. [approve-custom-erc.dto.ts:ApproveCustomErcDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
