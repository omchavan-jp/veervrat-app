# 20260701105333_journey_live_unique_index

## Overview

Historical partial unique live journey index [migration.sql:journeys_vratarthi_sentence_live_key].

## Interface

- Indexes vratarthi_id/sentence_id pairs [migration.sql:journeys_vratarthi_sentence_live_key].

## Invariants

- Only one row per pair where deleted_at IS NULL and state <> completed [migration.sql:journeys_vratarthi_sentence_live_key].

## Side Effects

- Applying creates unique index and rejects conflicting rows [migration.sql:CREATE UNIQUE INDEX].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
