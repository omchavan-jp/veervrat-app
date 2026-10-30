# 20260822135517_pending_signup_username

## Overview

Historical pending signup username field [migration.sql:pending_signups].

## Interface

- Adds required username TEXT [migration.sql:pending_signups].

## Invariants

- Username is NOT NULL [migration.sql:NOT NULL].

## Side Effects

- Applying deletes every existing pending_signups row before column addition [migration.sql:DELETE FROM].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
