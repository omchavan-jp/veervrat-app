# observability

## Overview

Resolves Sentry configuration and recursively redacts diagnostic values. [sentry-config.ts:resolveSentryConfig] [sentry-config.ts:scrubEvent]

## Interface

- Local SentryConfig type and resolveSentryConfig(env?) return enabled/dsn/environment/release/message fields; scrubEvent<T>(event) returns recursively redacted arrays/objects/strings. [sentry-config.ts:SentryConfig] [sentry-config.ts:resolveSentryConfig] [sentry-config.ts:scrubEvent]

## Invariants

- Only nonblank DSNs beginning http:// or https:// enable tracking; environment prefers ENVIRONMENT then NODE_ENV then development, release uses COMMIT_SHA. [sentry-config.ts:resolveSentryConfig]
- Email-like strings and opaque word-boundary strings of >=32 allowed token characters become redaction markers; nonstring primitives pass through. [sentry-config.ts:scrubEvent]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
