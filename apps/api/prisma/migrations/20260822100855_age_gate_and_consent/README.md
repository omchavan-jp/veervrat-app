# 20260822100855_age_gate_and_consent

## Overview

Historical age/consent and pending signup storage; later migration relaxes dob requirement [migration.sql:users] [migration.sql:user_consents] [migration.sql:pending_signups].

## Interface

- Adds cms_pages.version default 1, user_consents and pending_signups [migration.sql:cms_pages] [migration.sql:user_consents] [migration.sql:pending_signups].

## Invariants

- Aborts if >50 users lack dob; consent unique by user/document/version [migration.sql:null_dob_count] [migration.sql:user_consents_user_id_document_key_version_key].

## Side Effects

- Applying deletes null-dob users when count is 1–50, then requires dob and creates consent/signup tables/indexes [migration.sql:DELETE FROM] [migration.sql:SET NOT NULL] [migration.sql:user_consents] [migration.sql:pending_signups].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
