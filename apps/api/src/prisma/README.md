# prisma

## Overview

Global Prisma module provides a PostgreSQL-backed Prisma client. [prisma.module.ts:PrismaModule] [prisma.service.ts:PrismaService]

## Interface

- Exports PrismaService globally and connects and disconnects on module lifecycle. [prisma.module.ts:PrismaModule] [prisma.service.ts:onModuleInit] [prisma.service.ts:onModuleDestroy]

## Invariants

- DATABASE_POOL_MAX must be a positive integer or defaults to 10. [prisma.service.ts:resolvePoolMax]

## Side Effects

- Opens and closes database connections and logs pool and connection errors. [prisma.service.ts:PrismaService]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
