# guards

## Overview

Provides double-submit CSRF enforcement and an opt-out decorator. [csrf.guard.ts:CsrfGuard] [csrf.guard.ts:SkipCsrf]

## Interface

- Local SKIP_CSRF_KEY='skipCsrf' and SkipCsrf() wrap imported SetMetadata; local CsrfGuard.canActivate(context) uses injected imported Reflector and request cookies/headers. [csrf.guard.ts:SKIP_CSRF_KEY] [csrf.guard.ts:SkipCsrf] [csrf.guard.ts:CsrfGuard]

## Invariants

- GET/HEAD/OPTIONS and reflected skips pass; other requests require nonempty equal csrf-token cookie and x-csrf-token header. [csrf.guard.ts:canActivate]

## Side Effects

- Throws imported AccessDeniedException('CSRF_INVALID') on missing/mismatched token. [csrf.guard.ts:canActivate]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
