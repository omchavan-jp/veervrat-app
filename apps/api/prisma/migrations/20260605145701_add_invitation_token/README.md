# 20260605145701_add_invitation_token

## Overview

Historical invitation token addition and backfill [migration.sql:invitations].

## Interface

- Adds required token and unique index [migration.sql:invitations] [migration.sql:invitations_token_key].

## Invariants

- Token must be supplied after DROP DEFAULT and is unique [migration.sql:DROP DEFAULT] [migration.sql:invitations_token_key].

## Side Effects

- Applying fills empty tokens with gen_random_uuid()::text [migration.sql:gen_random_uuid].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
