# 20260616140214_add_blog_comment_threading_and_report

## Overview

Historical blog comment threading/report fields [migration.sql:blog_comments].

## Interface

- Adds nullable parent_comment_id UUID and reported_at timestamp [migration.sql:blog_comments].

## Invariants

- None explicitly defined in this directory.

## Side Effects

- Applying alters blog_comments without adding a parent FK [migration.sql:blog_comments].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
