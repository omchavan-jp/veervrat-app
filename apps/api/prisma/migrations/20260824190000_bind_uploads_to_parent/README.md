# 20260824190000_bind_uploads_to_parent

## Overview

Historical upload attachment to experience logs [migration.sql:uploads].

## Interface

- Adds nullable experience_log_id and lookup index [migration.sql:uploads] [migration.sql:uploads_experience_log_id_idx].

## Invariants

- FK uses ON DELETE SET NULL and ON UPDATE CASCADE [migration.sql:uploads_experience_log_id_fkey].

## Side Effects

- Applying adds column, FK and index [migration.sql:uploads] [migration.sql:uploads_experience_log_id_fkey] [migration.sql:uploads_experience_log_id_idx].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
