# 20260830080000_lowercase_email_storage

## Overview

Historical lowercase email data migration [migration.sql:users] [migration.sql:auth_accounts].

## Interface

- Normalizes users.email and email-provider account identifiers with lower() [migration.sql:lower].

## Invariants

- Account identifier update is scoped to provider = email [migration.sql:WHERE].

## Side Effects

- Applying updates mixed-case users and email auth_accounts; Google account identifiers are excluded by predicate [migration.sql:users] [migration.sql:auth_accounts].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
