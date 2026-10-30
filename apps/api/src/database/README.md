# database

## Overview

Provides expired-record cleanup, CLI Prisma construction and initial administrator role granting [cleanup-expired.ts:cleanupExpired] [cli-prisma.ts:createCliPrisma] [grant-admin.ts:grantAdmin].

## Interface

- cleanupExpired accepts a constrained Prisma client and optional reference date and returns per-table deletion counts [cleanup-expired.ts:cleanupExpired] [cleanup-expired.ts:CleanupCounts] [cleanup-expired.ts:CleanupPrisma].
- createCliPrisma constructs a PostgreSQL-adapter Prisma client from DATABASE_URL [cli-prisma.ts:createCliPrisma].
- readConfig reads bootstrap email and unverified override, and grantAdmin returns a numeric status while AUDIT_ACTION identifies its audit record [grant-admin.ts:readConfig] [grant-admin.ts:grantAdmin] [grant-admin.ts:AUDIT_ACTION].
- POLICY_VERSION is 2; POLICY_DOCUMENTS contains terms/privacy English and Marathi rich-text documents; POLICY_KEYS derives their keys. [policy-content.ts:POLICY_VERSION] [policy-content.ts:POLICY_DOCUMENTS] [policy-content.ts:POLICY_KEYS]
- TIER_MAP maps local/national/international to uppercase tiers; parseWeaknessNames splits trimmed nonempty pipe-delimited names; splitCsvRows handles quoted commas/newlines and escaped quotes; parseCsv returns trimmed header-keyed records. [seed-utils.ts:TIER_MAP] [seed-utils.ts:parseWeaknessNames] [seed-utils.ts:splitCsvRows] [seed-utils.ts:parseCsv]
- publishPolicies accepts PublishPrisma and returns PublishOutcome entries with published/unchanged/refused-older actions and from/to versions. [publish-policies.ts:PublishPrisma] [publish-policies.ts:PublishOutcome] [publish-policies.ts:publishPolicies]
- readConfig reads trimmed WIPE_USERS_CONFIRM and ENVIRONMENT; WipeConfig supplies confirm/environment and wipeUsers returns an exit code; MAX_USERS_TO_WIPE is 50. [wipe-users.ts:readConfig] [wipe-users.ts:WipeConfig] [wipe-users.ts:wipeUsers] [wipe-users.ts:MAX_USERS_TO_WIPE]

## Invariants

- Cleanup deletes only session, verification-token and pending-signup rows with expiresAt strictly before now, sequentially without a transaction [cleanup-expired.ts:cleanupExpired].
- CLI client construction refuses missing DATABASE_URL [cli-prisma.ts:createCliPrisma].
- Admin grants are additive, no-op for missing configured email/already-admin, fail for unknown email or unverified account without override, and await the audit insert after creating the role [grant-admin.ts:grantAdmin].
- Policy publication preserves equal versions and refuses stored versions higher than code; only absent or older documents are written. [publish-policies.ts:publishPolicies]
- Seeding preserves existing policy pages, skips missing referenced rows and unknown exposure tiers, and inserts relation rows with skipDuplicates. [seed.ts:seed]
- User wiping does nothing without confirmation, refuses confirmation/environment mismatch and counts above 50, and skips truncation for zero users. [wipe-users.ts:wipeUsers] [wipe-users.ts:MAX_USERS_TO_WIPE]

## Side Effects

- Cleanup deletes expired database rows [cleanup-expired.ts:cleanupExpired].
- Granting reads the account, creates an ADMIN userRole and an auditEvent and writes console status/errors [grant-admin.ts:grantAdmin].
- Importing grant-admin loads apps/api/.env via dotenv, while directly invoked cleanup/admin entry points connect/disconnect Prisma and set error exit status [grant-admin.ts:dotenv.config] [grant-admin.ts:require.main] [cleanup-expired.ts:require.main].
- parseCsv reads UTF-8 files. [seed-utils.ts:parseCsv]
- seed.ts loads apps/api/.env and invokes seed at module load; seed reads data/seed CSVs, creates/updates taxonomy, sentences and pool ERC content, inserts weakness links and missing policy pages, logs counts/warnings, disconnects in finally, and exits 1 on rejection. [seed.ts:dotenv.config] [seed.ts:DATA_DIR] [seed.ts:seed] [seed.ts:seed().catch]
- publishPolicies creates or updates CMS rows; direct execution connects, logs outcomes, sets exitCode 1 for refused-older or 0 otherwise, disconnects in finally and exits 1 on failure. [publish-policies.ts:publishPolicies] [publish-policies.ts:main] [publish-policies.ts:require.main]
- wipe-users.ts loads apps/api/.env; permitted wipe executes TRUNCATE TABLE users CASCADE and logs remaining count, returning 0 only if empty; direct execution connects, assigns returned exitCode, disconnects in finally and exits 1 on failure. [wipe-users.ts:dotenv.config] [wipe-users.ts:wipeUsers] [wipe-users.ts:main] [wipe-users.ts:require.main]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
