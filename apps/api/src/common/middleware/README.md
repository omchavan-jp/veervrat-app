# middleware

## Overview

Attaches correlation IDs and provisions CSRF tokens. [correlation-id.middleware.ts:CorrelationIdMiddleware] [csrf.middleware.ts:CsrfMiddleware]

## Interface

- Local CorrelationIdMiddleware.use(req,res,next) uses incoming x-correlation-id or imported randomUUID; local CsrfMiddleware.use(req,res,next) reuses csrf-token or imported randomBytes and imported authCookieOptions. [correlation-id.middleware.ts:CorrelationIdMiddleware] [csrf.middleware.ts:CsrfMiddleware]

## Invariants

- A new CSRF token uses 32 random bytes as hex and an httpOnly=false cookie; existing cookie tokens are reused. [csrf.middleware.ts:use]

## Side Effects

- Sets X-Correlation-Id response header and assigns correlationId to injected PinoLogger; sets missing CSRF cookie and res.locals.csrfToken; both invoke next(). [correlation-id.middleware.ts:use] [csrf.middleware.ts:use]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
