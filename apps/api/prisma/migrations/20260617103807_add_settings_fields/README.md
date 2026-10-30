# 20260617103807_add_settings_fields

## Overview

Historical user settings storage [migration.sql:users].

## Interface

- Adds notification_prefs JSONB and nullable pending_email [migration.sql:users].

## Invariants

- notification_prefs required with empty object default [migration.sql:NOT NULL] [migration.sql:DEFAULT].

## Side Effects

- Applying alters users [migration.sql:users].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
