# 20260823034921_anonymisation_clears_identity_fields

## Overview

Historical relaxation of stored user birth date [migration.sql:users].

## Interface

- Drops users.dob NOT NULL [migration.sql:DROP NOT NULL].

## Invariants

- Database permits null dob after applying [migration.sql:DROP NOT NULL].

## Side Effects

- Applying changes users column nullability [migration.sql:users].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
