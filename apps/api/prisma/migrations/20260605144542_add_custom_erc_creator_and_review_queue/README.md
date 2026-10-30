# 20260605144542_add_custom_erc_creator_and_review_queue

## Overview

Historical custom ERC review storage [migration.sql:custom_erc_reviews].

## Interface

- Adds created_by_id to journey ERC tables and custom_erc_reviews with pending default [migration.sql:journey_challenges] [migration.sql:journey_exposures] [migration.sql:journey_resolutions] [migration.sql:custom_erc_reviews].

## Invariants

- Review ERC references use ON DELETE SET NULL [migration.sql:custom_erc_reviews_journey_exposure_id_fkey] [migration.sql:custom_erc_reviews_journey_resolution_id_fkey] [migration.sql:custom_erc_reviews_journey_challenge_id_fkey].

## Side Effects

- Applying alters three tables and creates reviews and their constraints [migration.sql:journey_challenges] [migration.sql:journey_exposures] [migration.sql:journey_resolutions] [migration.sql:custom_erc_reviews].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
