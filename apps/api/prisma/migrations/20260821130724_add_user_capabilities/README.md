# 20260821130724_add_user_capabilities

## Overview

Historical user capability grants [migration.sql:user_capabilities].

## Interface

- Creates capability enum feedback_widget/content_edit and grant table with granted_at/granted_by [migration.sql:capability] [migration.sql:user_capabilities].

## Invariants

- Composite user/capability primary key and cascading user FK [migration.sql:user_capabilities_pkey] [migration.sql:user_capabilities_user_id_fkey].

## Side Effects

- Applying creates enum, table and FK [migration.sql:capability] [migration.sql:user_capabilities] [migration.sql:user_capabilities_user_id_fkey].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
