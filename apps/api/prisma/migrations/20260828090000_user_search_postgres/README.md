# 20260828090000_user_search_postgres

## Overview

Historical PostgreSQL user search indexes [migration.sql:users_display_name_trgm] [migration.sql:users_username_trgm].

## Interface

- Defines GIN trigram indexes on display_name and username [migration.sql:users_display_name_trgm] [migration.sql:users_username_trgm].

## Invariants

- Creation uses IF NOT EXISTS [migration.sql:IF NOT EXISTS].

## Side Effects

- Applying creates both user indexes using gin_trgm_ops [migration.sql:users_display_name_trgm] [migration.sql:users_username_trgm].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
