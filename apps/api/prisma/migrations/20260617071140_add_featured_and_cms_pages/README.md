# 20260617071140_add_featured_and_cms_pages

## Overview

Historical featured flags and CMS pages [migration.sql:cms_pages].

## Interface

- Adds featured flags on blogs/experience_logs and bilingual CMS title/body columns [migration.sql:blogs] [migration.sql:experience_logs] [migration.sql:cms_pages].

## Invariants

- CMS key unique; featured flags required and default false [migration.sql:cms_pages_key_key] [migration.sql:blogs] [migration.sql:experience_logs].

## Side Effects

- Applying creates CMS table/key index and featured indexes [migration.sql:cms_pages] [migration.sql:cms_pages_key_key] [migration.sql:blogs_featured_idx] [migration.sql:experience_logs_featured_idx].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
