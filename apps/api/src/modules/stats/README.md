# stats

## Overview

Guest-accessible platform statistics aggregate four counts with Redis caching. [stats.controller.ts:getPlatformStats] [stats.service.ts:getPlatformStats]

## Interface

- GET stats/platform returns counts of vratarthis, distinct VMs, completed tests and practice check-ins. [stats.controller.ts:StatsController] [stats.repository.ts:PlatformStats]

## Invariants

- Practice check-ins count DONE and PARTIAL; tests count non-drafts. Cache TTL is 3600 seconds and Redis failures fall back to database results. [stats.repository.ts:getPlatformStats] [stats.service.ts:getPlatformStats]
- VM counts use distinct vmId values from global VM relationships of any state, excluding journey-only assignments. VA role counts do not filter deleted or suspended users. [stats.repository.ts:getPlatformStats]

## Side Effects

- Reads Prisma counts and reads or writes Redis platform:stats, logging cache errors. [stats.repository.ts:getPlatformStats] [stats.service.ts:getPlatformStats]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
