# config

## Overview

Defines globally available environment configuration and Joi validation [config.module.ts:AppConfigModule].

## Interface

- AppConfigModule loads .env.local then .env through a global configuration module [config.module.ts:AppConfigModule].

## Invariants

- Requires DATABASE_URL, FRONTEND_URL and a SESSION_SECRET of at least 32 characters and reports all schema errors [config.module.ts:AppConfigModule].
- Validates deployment/environment, logging and cookie enums and defaults port to 3001, pool maximum to 10, shutdown timeout to 10000 and gated feedback/docs modes to off [config.module.ts:AppConfigModule].

## Side Effects

- Initializes environment-file loading and schema validation through Nest configuration registration [config.module.ts:AppConfigModule].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
