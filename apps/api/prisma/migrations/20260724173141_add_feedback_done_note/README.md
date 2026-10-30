# 20260724173141_add_feedback_done_note

## Overview

Historical feedback completion note [migration.sql:feedback_items].

## Interface

- Adds nullable done_note TEXT [migration.sql:feedback_items].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters feedback_items [migration.sql:feedback_items].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
