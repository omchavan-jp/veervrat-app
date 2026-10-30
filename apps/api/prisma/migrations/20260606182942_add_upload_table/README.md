# 20260606182942_add_upload_table

## Overview

Historical upload table creation; URL column is later renamed [migration.sql:uploads].

## Interface

- Creates uploads with uploader_id, room_id, minio_url, filename and timestamps [migration.sql:uploads].

## Invariants

- Uploader must reference users; deletion restricted [migration.sql:uploads_uploader_id_fkey].

## Side Effects

- Applying creates table, uploader/room indexes and FK [migration.sql:uploads] [migration.sql:uploads_uploader_id_idx] [migration.sql:uploads_room_id_idx] [migration.sql:uploads_uploader_id_fkey].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
