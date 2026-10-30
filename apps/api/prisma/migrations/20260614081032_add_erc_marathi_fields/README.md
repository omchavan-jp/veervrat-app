# 20260614081032_add_erc_marathi_fields

## Overview

Historical Marathi ERC copy fields [migration.sql:exposures].

## Interface

- Adds nullable title_mr and description_mr to pool and journey exposures, resolutions and challenges [migration.sql:exposures] [migration.sql:resolutions] [migration.sql:challenges] [migration.sql:journey_exposures] [migration.sql:journey_resolutions] [migration.sql:journey_challenges].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters six ERC tables [migration.sql:exposures] [migration.sql:resolutions] [migration.sql:challenges] [migration.sql:journey_exposures] [migration.sql:journey_resolutions] [migration.sql:journey_challenges].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
