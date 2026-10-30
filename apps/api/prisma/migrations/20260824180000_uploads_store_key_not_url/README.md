# 20260824180000_uploads_store_key_not_url

## Overview

Historical upload URL conversion to storage keys [migration.sql:uploads].

## Interface

- Renames minio_url to storage_key, adds upload_purpose chat/experience/blog and key index [migration.sql:uploads] [migration.sql:upload_purpose] [migration.sql:uploads_storage_key_idx].

## Invariants

- Preflight rejects unusable extracted keys; purpose required/default experience [migration.sql:bad_count] [migration.sql:uploads].

## Side Effects

- Applying renames column and strips URL prefix through final slash from matching values [migration.sql:RENAME COLUMN] [migration.sql:regexp_replace].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
