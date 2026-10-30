# filters

## Overview

Converts uncaught failures into HTTP JSON errors and records server failures. [http-exception.filter.ts:GlobalExceptionFilter]

## Interface

- Local GlobalExceptionFilter.catch(exception,host) handles imported Nest HttpException bodies, body-parser entity.too.large objects, and unknown failures. [http-exception.filter.ts:GlobalExceptionFilter]

## Invariants

- Responses include statusCode/error/message and defined details; string exception bodies receive status-derived codes; oversized payload objects become 413; unknown errors default to generic 500. [http-exception.filter.ts:catch]

## Side Effects

- Writes the HTTP response; errors with status >=500 are logged and passed to imported Sentry.captureException. [http-exception.filter.ts:catch]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
