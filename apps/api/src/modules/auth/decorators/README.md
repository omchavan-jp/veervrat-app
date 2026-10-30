# decorators

## Overview

HTTP parameter decorators expose request user and session identity. [current-user.decorator.ts:CurrentUser] [current-session-id.decorator.ts:CurrentSessionId]

## Interface

- CurrentUser returns request.user cast as SessionUser. [current-user.decorator.ts:CurrentUser]
- CurrentSessionId returns optional request.sessionId. [current-session-id.decorator.ts:CurrentSessionId]

## Invariants

- CurrentSessionId documents SessionGuard as the producer of request.sessionId and session-bound reauthentication as its purpose. [current-session-id.decorator.ts:CurrentSessionId]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
