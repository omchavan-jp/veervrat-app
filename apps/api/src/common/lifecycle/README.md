# lifecycle

## Overview

Bounds process-signal shutdown and cleanup. [graceful-shutdown.ts:registerShutdownHandlers]

## Interface

- Local DEFAULT_SHUTDOWN_TIMEOUT_MS=10000; ShutdownLogger, ShutdownTarget and ShutdownOptions define logging/close/cleanup/exit contracts; resolveShutdownTimeoutMs(raw?) parses a finite positive timeout; registerShutdownHandlers(app,logger,options?) installs signal callbacks. [graceful-shutdown.ts:DEFAULT_SHUTDOWN_TIMEOUT_MS] [graceful-shutdown.ts:ShutdownLogger] [graceful-shutdown.ts:ShutdownTarget] [graceful-shutdown.ts:ShutdownOptions] [graceful-shutdown.ts:resolveShutdownTimeoutMs] [graceful-shutdown.ts:registerShutdownHandlers]

## Invariants

- Repeated signals are ignored after shutdown begins; onClosed follows successful app.close; timer is unref'd and cleared on success/failure. [graceful-shutdown.ts:registerShutdownHandlers]

## Side Effects

- Registers SIGTERM/SIGINT listeners, logs progress/errors, schedules force exit, closes app and optional extra connections, exits 0 on success or 1 on timeout/failure through injected exit or process.exit. [graceful-shutdown.ts:registerShutdownHandlers]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
