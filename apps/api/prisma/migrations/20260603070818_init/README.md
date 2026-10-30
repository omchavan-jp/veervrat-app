# 20260603070818_init

## Overview

Initial historical PostgreSQL domain DDL [migration.sql:users].

## Interface

- Creates identity, assessment, journeys, ERC, publication, shloka, resource, notification and audit tables [migration.sql:users] [migration.sql:test_attempts] [migration.sql:journeys] [migration.sql:journey_exposures] [migration.sql:blogs] [migration.sql:shlokas] [migration.sql:resources] [migration.sql:notifications] [migration.sql:audit_events].

## Invariants

- Unique email/username, provider identity, session token and assessment answer pairs [migration.sql:users_email_key] [migration.sql:users_username_key] [migration.sql:auth_accounts_provider_provider_account_id_key] [migration.sql:sessions_token_key] [migration.sql:test_answers_test_attempt_id_sentence_id_key].

## Side Effects

- Applying creates enum types, tables, indexes and foreign keys [migration.sql:role] [migration.sql:users] [migration.sql:users_email_key] [migration.sql:user_roles_user_id_fkey].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.

Unit tests do not apply these SQL migrations or validate a deployed database. Migration scripts are historical changes; the current schema is defined in `apps/api/prisma/schema.prisma`.
