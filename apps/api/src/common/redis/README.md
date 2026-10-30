# redis

## Overview

Registers a global Redis client provider [redis.module.ts:RedisModule] [redis.provider.ts:RedisProvider].

## Interface

- RedisModule exports RedisProvider under the REDIS_CLIENT injection token [redis.module.ts:RedisModule] [redis.provider.ts:REDIS_CLIENT] [redis.provider.ts:RedisProvider].

## Invariants

- The factory uses REDIS_URL or redis://localhost:6379 and enables lazyConnect [redis.provider.ts:RedisProvider].

## Side Effects

- Creates a Redis client and registers an error listener that logs warning messages [redis.provider.ts:RedisProvider].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
