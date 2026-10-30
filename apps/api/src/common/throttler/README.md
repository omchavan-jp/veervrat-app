# throttler

## Overview

Defines rate-limit buckets, storage configuration and application throttling responses [throttler-config.factory.ts:buildThrottlerOptions] [app-throttler.guard.ts:AppThrottlerGuard].

## Interface

- Exports default 300/minute and identity 1,000,000/15-minute bucket definitions, registration settings and the Redis storage factory [throttler-config.factory.ts:GLOBAL_THROTTLER] [throttler-config.factory.ts:IDENTITY_THROTTLER] [throttler-config.factory.ts:registerThrottle] [throttler-config.factory.ts:buildThrottlerOptions].
- AppThrottlerGuard customizes identity keys and rate-limit errors [app-throttler.guard.ts:AppThrottlerGuard].

## Invariants

- Registration stays at 5/hour in production and accepts only positive finite overrides elsewhere [throttler-config.factory.ts:registerThrottle].
- Identity keys include a truncated SHA-256 hash of trimmed lowercase email when present and otherwise retain base key generation [app-throttler.guard.ts:AppThrottlerGuard.generateKey].
- Rate-limit retry delay is rounded up and at least one second [app-throttler.guard.ts:AppThrottlerGuard.throwThrottlingException].

## Side Effects

- Missing Redis URL emits a per-process warning and configured Redis URL constructs Redis-backed storage [throttler-config.factory.ts:buildThrottlerOptions].
- Throttling sets Retry-After and rejects with RateLimitedException [app-throttler.guard.ts:AppThrottlerGuard.throwThrottlingException].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
