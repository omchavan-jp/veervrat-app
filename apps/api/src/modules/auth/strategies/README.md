# strategies

## Overview

Passport Google strategy converts provider profiles into application GoogleProfile values. [google.strategy.ts:GoogleStrategy]

## Interface

- GoogleStrategy registers google with email/profile scope and validate invokes the VerifyCallback. [google.strategy.ts:GoogleStrategy]

## Invariants

- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL are required; absent primary email becomes empty string, absent name becomes null, verified must equal true. [google.strategy.ts:constructor] [google.strategy.ts:validate]

## Side Effects

- Reads OAuth configuration and invokes done(null, googleProfile). [google.strategy.ts:constructor] [google.strategy.ts:validate]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
