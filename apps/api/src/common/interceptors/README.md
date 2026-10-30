# interceptors

## Overview

Applies the success data envelope using imported RxJS map. [response.interceptor.ts:ResponseInterceptor]

## Interface

- Local ResponseInterceptor<T>.intercept(context,next) maps the imported CallHandler observable into {data:T}. [response.interceptor.ts:ResponseInterceptor]

## Invariants

- 204, undefined, and objects already containing data pass unchanged; other values become {data}. [response.interceptor.ts:intercept]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
