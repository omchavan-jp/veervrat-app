# 20260703223302_add_feedback_tables

## Overview

Historical feedback and upvote tables [migration.sql:feedback_items] [migration.sql:feedback_upvotes].

## Interface

- Defines feedback_type issue/improvement and feedback_status new/triaged/done/declined with new default [migration.sql:feedback_type] [migration.sql:feedback_status] [migration.sql:feedback_items].

## Invariants

- One upvote per item/user; reporter, item and voter references cascade deletes [migration.sql:feedback_upvotes_feedback_item_id_user_id_key] [migration.sql:feedback_items_reporter_id_fkey] [migration.sql:feedback_upvotes_feedback_item_id_fkey] [migration.sql:feedback_upvotes_user_id_fkey].

## Side Effects

- Applying creates enum types, tables, status index and FKs [migration.sql:feedback_type] [migration.sql:feedback_status] [migration.sql:feedback_items] [migration.sql:feedback_upvotes] [migration.sql:feedback_items_status_created_at_idx].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
