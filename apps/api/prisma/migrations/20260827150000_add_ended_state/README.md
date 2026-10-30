# 20260827150000_add_ended_state

## Overview

Historical ended mentor relationship state and backfill [migration.sql:vm_relationship_state].

## Interface

- Adds ended enum value if absent [migration.sql:vm_relationship_state] [migration.sql:IF NOT EXISTS].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying sets state ended on vm_relationships and journey_vm_assignments with ended_at present and different state [migration.sql:vm_relationships] [migration.sql:journey_vm_assignments].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
