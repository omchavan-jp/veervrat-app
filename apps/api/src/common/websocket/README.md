# websocket

## Overview

Provides a Socket.IO adapter backed by dedicated Redis publishing and subscription clients [redis-io.adapter.ts:RedisIoAdapter].

## Interface

- RedisIoAdapter accepts an application context, creates Socket.IO servers and exposes closeRedisConnections [redis-io.adapter.ts:RedisIoAdapter] [redis-io.adapter.ts:RedisIoAdapter.createIOServer] [redis-io.adapter.ts:RedisIoAdapter.closeRedisConnections].

## Invariants

- Publisher and subscriber are separate duplicates of the injected REDIS_CLIENT [redis-io.adapter.ts:RedisIoAdapter.createIOServer].

## Side Effects

- Server creation connects both Redis duplicates, installs the Redis adapter and logs setup or connection errors [redis-io.adapter.ts:RedisIoAdapter.createIOServer].
- Shutdown requests quit on both duplicates using allSettled [redis-io.adapter.ts:RedisIoAdapter.closeRedisConnections].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
