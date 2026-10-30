# Shared API infrastructure

## Overview

Architectural index of the immediate source subdirectories documented below.

## Interface

- [age](./age/README.md): Pure UTC calendar helpers enforce the exported minimum age.
- [exceptions](./exceptions/README.md): Exports structured domain HTTP exception classes built on imported Nest exception/status APIs.
- [filters](./filters/README.md): Converts uncaught failures into HTTP JSON errors and records server failures.
- [guards](./guards/README.md): Provides double-submit CSRF enforcement and an opt-out decorator.
- [http](./http/README.md): Centralizes auth cookie options and positive proxy-hop parsing.
- [interceptors](./interceptors/README.md): Applies the success data envelope using imported RxJS map.
- [lifecycle](./lifecycle/README.md): Bounds process-signal shutdown and cleanup.
- [middleware](./middleware/README.md): Attaches correlation IDs and provisions CSRF tokens.
- [observability](./observability/README.md): Resolves Sentry configuration and recursively redacts diagnostic values.
- [permissions](./permissions/README.md): Provides resource-aware permission evaluation and Nest permission metadata/guard enforcement.
- [redis](./redis/README.md): Registers a global Redis client provider.
- [throttler](./throttler/README.md): Defines rate-limit buckets, storage configuration and application throttling responses.
- [tiptap](./tiptap/README.md): Sanitizes Tiptap JSON documents and extracts plain text.
- [types](./types/README.md): Augments the global Express request identity shape.
- [websocket](./websocket/README.md): Provides a Socket.IO adapter backed by dedicated Redis publishing and subscription clients.

## Invariants

- No additional local contract; see the child contracts above for component-specific behavior.

## Side Effects

- No additional local contract; see the child contracts above for component-specific behavior.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
