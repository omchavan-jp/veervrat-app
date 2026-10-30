# 20260610215600_add_profile_visibility

## Overview

Historical profile visibility JSON storage [migration.sql:users].

## Interface

- Adds profile_visibility JSONB [migration.sql:users].

## Invariants

- profile_visibility is required with empty object default [migration.sql:NOT NULL] [migration.sql:DEFAULT].

## Side Effects

- Applying adds a users column [migration.sql:users].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
