# 20260719174921_add_feedback_modification_addition_types

## Overview

Historical feedback category enum expansion [migration.sql:feedback_type].

## Interface

- Adds modification and addition values [migration.sql:feedback_type].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters feedback_type twice [migration.sql:ALTER TYPE].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
