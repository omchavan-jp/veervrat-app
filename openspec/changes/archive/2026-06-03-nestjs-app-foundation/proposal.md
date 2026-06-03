## Why

The NestJS API has a working skeleton (exception filter, response interceptor, PrismaModule, ConfigModule, health endpoint, auth) but is missing the observability infrastructure that every feature depends on: structured Pino logging and per-request correlation IDs. Config validation also exists but has no Joi schema — the app currently starts silently with missing env vars. The health endpoint resolves at `/api/v1/health` when it should be at `/api/health` per API Conventions §12.

## What Changes

- **Add `nestjs-pino` structured logging** — every log line is JSON with the fields defined in `documentation/Observability-Standard.md`. Sensitive paths redacted (`req.headers.cookie`, `req.body.password`). Pino Pretty in dev.
- **Add correlation ID middleware** — UUID per request, attached to Pino context so all log lines in a request carry `correlationId`. Returned in `X-Correlation-Id` response header.
- **Add Joi validation schema to `AppConfigModule`** — required vars validated at startup, app exits fast on missing config.
- **Fix health endpoint path** — move from `/api/v1/health` to `/api/health` via global prefix exclusion. No auth required.
- **Update `documentation/Platform-Engineering-Standard.md`** — add `nestjs-pino`, `pino-http`, `pino-pretty`, `joi` to the approved library catalog (required before any implementation per CLAUDE.md).

## Capabilities

### New Capabilities
- `pino-logging`: Structured JSON logging via `nestjs-pino` + `pino-http`, log level from `LOG_LEVEL` env, sensitive field redaction, Pino Pretty in dev.
- `correlation-id`: Per-request UUID middleware injecting `correlationId` into Pino logger context and returning `X-Correlation-Id` header.
- `config-validation`: Joi schema in `AppConfigModule` — required vars fail fast at startup.

### Modified Capabilities
- `health-endpoint`: Path corrected from `/api/v1/health` to `/api/health` (excluded from `api/v1` global prefix per API Conventions §12).

## Impact

- `documentation/Platform-Engineering-Standard.md` — add 4 packages to approved library catalog
- `apps/api/src/app.module.ts` — import `LoggerModule` from `nestjs-pino`
- `apps/api/src/main.ts` — use Pino logger adapter, fix health prefix exclusion
- `apps/api/src/config/config.module.ts` — add Joi validation schema
- `apps/api/src/app.controller.ts` — fix `@Get` path so health resolves at `/api/health`
- `apps/api/src/common/middleware/correlation-id.middleware.ts` — new file
- New packages: `nestjs-pino`, `pino-http`, `pino-pretty` (devDep), `joi`
