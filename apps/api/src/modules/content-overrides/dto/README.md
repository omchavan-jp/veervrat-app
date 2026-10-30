# dto

## Overview

Validation contracts constrain staged message keys, locales and values. [upsert-override.dto.ts:UpsertOverrideDto] [discard-override.dto.ts:DiscardOverrideDto]

## Interface

- Exports UpsertOverrideDto, DiscardOverrideDto and OVERRIDE_LOCALES/OverrideLocale. [upsert-override.dto.ts:UpsertOverrideDto] [upsert-override.dto.ts:OVERRIDE_LOCALES] [discard-override.dto.ts:DiscardOverrideDto]

## Invariants

- Keys are 1–200 characters and dotted alphanumeric/underscore segments; locales are en or mr; upsert value is 1–5000 characters and baseValue is at most 5000. [upsert-override.dto.ts:UpsertOverrideDto] [discard-override.dto.ts:DiscardOverrideDto]

## Side Effects

- class-validator decorators register validation metadata. [upsert-override.dto.ts:UpsertOverrideDto] [discard-override.dto.ts:DiscardOverrideDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
