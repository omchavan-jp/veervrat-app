# types

## Overview

Augments the global Express request identity shape [express.d.ts:Request].

## Interface

- Express.Request exposes optional SessionUser user property [express.d.ts:Request].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
