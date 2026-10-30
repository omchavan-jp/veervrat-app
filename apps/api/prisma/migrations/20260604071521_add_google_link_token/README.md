# 20260604071521_add_google_link_token

## Overview

Historical Google linking token extension [migration.sql:verification_type].

## Interface

- Adds google_link enum value and nullable token metadata JSONB [migration.sql:verification_type] [migration.sql:verification_tokens].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters enum and token table [migration.sql:verification_type] [migration.sql:verification_tokens].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
