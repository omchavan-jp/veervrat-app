# API application composition

## Overview

Composes and starts the Nest application, configures HTTP behavior, and exposes dependency probes. [app.module.ts:AppModule] [bootstrap.ts:configureApp] [main.ts:bootstrap] [app.controller.ts:AppController]

## Interface

- Local AppController exports health() at GET /health and ready() at GET /ready; ready reports database/Redis checks and throws imported ServiceUnavailableException when either fails. [app.controller.ts:AppController]
- Local AppModule exports configure(consumer), wiring CorrelationIdMiddleware and CsrfMiddleware to all routes; imports domain/config/Prisma/Redis modules and registers imported throttler, CSRF guard, and audit interceptor globally. [app.module.ts:AppModule]
- Local configureApp(app) enables shutdown hooks, trust proxy, helmet, cookie parsing, API prefix, validation, GlobalExceptionFilter, and ResponseInterceptor; these collaborators are imported APIs. [bootstrap.ts:configureApp]
- [common](./common/README.md): Index of documented source components.
- [config](./config/README.md): Defines globally available environment configuration and Joi validation.
- [database](./database/README.md): Provides expired-record cleanup, CLI Prisma construction and initial administrator role granting.
- [modules](./modules/README.md): Index of documented source components.
- [prisma](./prisma/README.md): Global Prisma module provides a PostgreSQL-backed Prisma client.

## Invariants

- GET health/ready bypass the api/v1 prefix and controller-level throttling/CSRF; validation transforms DTOs, whitelists fields, and rejects unknown fields, flattening nested field paths into ValidationException details. [bootstrap.ts:configureApp] [app.controller.ts:AppController]
- Pino redacts request cookies/passwords; instrumentation disables tracing/default PII, samples all errors, and scrubs events before sending. [app.module.ts:AppModule] [instrument.ts:config]

## Side Effects

- ready issues Prisma SELECT 1 and Redis PING concurrently. [app.controller.ts:ready]
- Importing instrument conditionally initializes imported Sentry and always prints its configuration message. [instrument.ts:config]
- main invokes private bootstrap at module load: creates Nest app, configures body limits from imported MAX_UPLOAD_MB, enables credentialed CORS for FRONTEND_URL, optionally installs imported RedisIoAdapter, registers shutdown handlers and listens on PORT or 3001. [main.ts:bootstrap]
- AppModule initializes scheduling and asynchronous logging/throttling configuration using injected Redis and environment variables. [app.module.ts:AppModule]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
