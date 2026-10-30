# 20260615121159_add_invitation_reminder_sent_at

## Overview

Historical invitation reminder timestamp [migration.sql:invitations].

## Interface

- Adds nullable reminder_sent_at TIMESTAMP(3) [migration.sql:invitations].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters invitations [migration.sql:invitations].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
