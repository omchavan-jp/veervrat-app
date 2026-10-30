# 20260827090000_content_suggestions

## Overview

Historical content suggestions storage [migration.sql:content_suggestions].

## Interface

- Adds content_suggest capability, suggestion_kind/status enums and bilingual contextual suggestions table [migration.sql:capability] [migration.sql:suggestion_kind] [migration.sql:suggestion_status] [migration.sql:content_suggestions].

## Invariants

- Required author references users with cascading deletion; status defaults new [migration.sql:content_suggestions_author_id_fkey] [migration.sql:content_suggestions].

## Side Effects

- Applying creates enums/table and status/entity/route/author indexes [migration.sql:suggestion_kind] [migration.sql:suggestion_status] [migration.sql:content_suggestions] [migration.sql:content_suggestions_status_idx] [migration.sql:content_suggestions_entity_type_entity_id_idx] [migration.sql:content_suggestions_route_idx] [migration.sql:content_suggestions_author_id_idx].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
