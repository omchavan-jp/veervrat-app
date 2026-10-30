# 20260610200030_add_account_setup_completed_at

## Overview

Historical account setup timestamp [migration.sql:users].

## Interface

- Adds nullable account_setup_completed_at TIMESTAMP(3) [migration.sql:users].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying adds a users column [migration.sql:users].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
