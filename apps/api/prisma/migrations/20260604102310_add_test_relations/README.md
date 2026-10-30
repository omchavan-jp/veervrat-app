# 20260604102310_add_test_relations

## Overview

Historical assessment relationship constraints [migration.sql:test_attempts_weakness_id_fkey].

## Interface

- Adds user and weakness foreign keys to test_attempts [migration.sql:test_attempts_user_id_fkey] [migration.sql:test_attempts_weakness_id_fkey].

## Invariants

- Both references restrict deletion and cascade updates [migration.sql:test_attempts_user_id_fkey] [migration.sql:test_attempts_weakness_id_fkey].

## Side Effects

- Applying adds referential constraints [migration.sql:test_attempts_user_id_fkey] [migration.sql:test_attempts_weakness_id_fkey].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
