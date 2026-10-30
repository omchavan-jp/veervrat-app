# scripts

## Overview

Integration database migration launcher [migrate-test-db.mjs:execFileSync].

## Interface

- Package scripts test:integration and db:test:migrate invoke this launcher; dotenv loads ../.env.test [../package.json:test:integration] [../package.json:db:test:migrate] [migrate-test-db.mjs:config].

## Invariants

- Missing DATABASE_URL logs an error and exits with status 1 [migrate-test-db.mjs:process.env.DATABASE_URL] [migrate-test-db.mjs:process.exit].

## Side Effects

- Execution runs npx prisma migrate deploy with inherited stdio/environment from the API directory [migrate-test-db.mjs:execFileSync].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
