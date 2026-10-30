# 20260614090133_add_trgm_entity_search_indexes

## Overview

Historical entity search trigram indexes, subsequently dropped by completion timestamp migration [migration.sql:journeys_title_trgm].

## Interface

- Declares pg_trgm and nine GIN indexes for entity names/text and journey title [migration.sql:pg_trgm] [migration.sql:weaknesses_name_en_trgm] [migration.sql:weaknesses_name_mr_trgm] [migration.sql:virtues_name_en_trgm] [migration.sql:virtues_name_mr_trgm] [migration.sql:subvirtues_name_en_trgm] [migration.sql:subvirtues_name_mr_trgm] [migration.sql:sentences_text_en_trgm] [migration.sql:sentences_text_mr_trgm] [migration.sql:journeys_title_trgm].

## Invariants

- Extension/index creation uses IF NOT EXISTS [migration.sql:IF NOT EXISTS].

## Side Effects

- Applying enables extension and creates indexes [migration.sql:pg_trgm] [migration.sql:journeys_title_trgm].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
