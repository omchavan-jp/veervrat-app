# dto

## Overview

Validates autocomplete query parameters. [entity-search-query.dto.ts:EntitySearchQueryDto]

## Interface

- q is a string of at most 120 characters; optional scope is all, concept or mine. [entity-search-query.dto.ts:EntitySearchQueryDto]

## Invariants

- Scope must match the listed values when supplied. [entity-search-query.dto.ts:EntitySearchQueryDto]

## Side Effects

- Defines validation metadata; no persistence. [entity-search-query.dto.ts:EntitySearchQueryDto]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
