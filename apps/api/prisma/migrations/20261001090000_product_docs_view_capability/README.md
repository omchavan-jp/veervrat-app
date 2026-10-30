# 20261001090000_product_docs_view_capability

## Overview

Historical product documentation viewing capability [migration.sql:capability].

## Interface

- Adds product_docs_view enum value [migration.sql:capability].

## Invariants

- Uses ADD VALUE IF NOT EXISTS [migration.sql:IF NOT EXISTS].

## Side Effects

- Applying alters capability enum [migration.sql:ALTER TYPE].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
