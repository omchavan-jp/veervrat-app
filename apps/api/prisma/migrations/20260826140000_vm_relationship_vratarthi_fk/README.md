# 20260826140000_vm_relationship_vratarthi_fk

## Overview

Historical vratarthi relationship foreign key [migration.sql:vm_relationships_vratarthi_id_fkey].

## Interface

- Adds vm_relationships.vratarthi_id reference to users.id [migration.sql:vm_relationships_vratarthi_id_fkey].

## Invariants

- Preflight rejects orphan rows; FK restricts deletes and cascades updates [migration.sql:orphan_count] [migration.sql:vm_relationships_vratarthi_id_fkey].

## Side Effects

- Applying checks existing rows before adding FK [migration.sql:DO] [migration.sql:vm_relationships_vratarthi_id_fkey].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
