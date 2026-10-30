# 20260614133513_add_journey_completion_submitted_at

## Overview

Historical journey completion timestamp and removal of entity trigram indexes [migration.sql:journeys].

## Interface

- Adds nullable completion_submitted_at [migration.sql:journeys].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying drops nine indexes for journey titles and bilingual sentence/entity names [migration.sql:journeys_title_trgm] [migration.sql:sentences_text_en_trgm] [migration.sql:sentences_text_mr_trgm] [migration.sql:subvirtues_name_en_trgm] [migration.sql:subvirtues_name_mr_trgm] [migration.sql:virtues_name_en_trgm] [migration.sql:virtues_name_mr_trgm] [migration.sql:weaknesses_name_en_trgm] [migration.sql:weaknesses_name_mr_trgm].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
