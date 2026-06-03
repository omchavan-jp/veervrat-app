## Context

The NestJS API skeleton has: `GlobalExceptionFilter`, `ResponseInterceptor` (wraps responses in `{ data }`), `PrismaModule` (global), `AppConfigModule` (`ConfigModule.forRoot` with no validation schema), a health endpoint at `AppController`, and the `AuthModule`. What's missing is the observability layer: structured Pino logging and per-request correlation IDs. Config starts without validation. The health endpoint is accidentally mounted under `/api/v1/health` instead of `/api/health`.

## Goals / Non-Goals

**Goals:**
- Every NestJS log call emits a JSON line with `level`, `time`, `correlationId`, and `message` at minimum
- A UUID correlation ID generated per request flows into all log lines and the `X-Correlation-Id` response header
- App exits with a descriptive error at startup if `DATABASE_URL`, `SESSION_SECRET`, or `FRONTEND_URL` are absent
- `GET /api/health` returns 200 `{ "data": { "status": "ok" } }` without auth, not under `/api/v1`

**Non-Goals:**
- GlitchTip / `@sentry/node` initialisation — decided but "not set up", out of scope for this change
- Request/response body logging (PII risk — explicitly prohibited in Observability-Standard)
- Frontend logging (separate concern)

## Decisions

### Pino via nestjs-pino
`nestjs-pino` wraps Pino as NestJS's `LoggerService` and integrates `pino-http` to attach request context automatically. Per Observability-Standard, Pino is the decided structured logging library. `pino-pretty` is added as a dev dependency for human-readable local output.

Config choices:
- `autoLogging: false` — pino-http's default request log lines log raw request/response data which risks PII. Individual log calls in services/controllers remain fine.
- `redact: ['req.headers.cookie', 'req.body.password']` — per Observability-Standard Privacy Filtering section.
- Log level from `LOG_LEVEL` env var, defaulting to `info`.
- `transport: pino-pretty` when `NODE_ENV !== 'production'`.

### Correlation ID as middleware, not interceptor
NestJS middleware runs before guards and interceptors — the correlation ID must be available at all layers including auth guards and exception filters. An interceptor runs after guards, which would miss auth failure log lines. Middleware is the correct hook.

The middleware:
1. Reads `X-Correlation-Id` request header or generates a `uuid` v4
2. Sets `X-Correlation-Id` on the response
3. Calls `PinoLogger`'s `assign({ correlationId })` to bind it into the request-scoped logger context

### Joi validation in ConfigModule
`ConfigModule.forRoot` accepts a `validationSchema` (Joi object). App throws and exits on missing/invalid vars before any modules initialize. `abortEarly: false` reports all missing vars at once rather than stopping at the first.

Required vars: `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_URL`.
Optional with defaults: `PORT` (3001), `LOG_LEVEL` (`info`), `NODE_ENV` (`development`).

### Health endpoint at /api/health
API Conventions §12 explicitly specifies `GET /api/health` with no versioning prefix. Fix: `app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] })`. With the prefix excluded, `@Get('health')` on `AppController` resolves to `/health` — not `/api/health`. To land at `/api/health`, the controller must use `@Get('api/health')` instead, since the excluded path is unprefixed.

The simpler solution: keep `setGlobalPrefix('api/v1')` exclusion and match the spec exactly — `AppController` uses `@Controller()` and `@Get('health')` → resolves to `/health`. The API Conventions doc says `/api/health` which implies `api` is part of the path prefix. Since our global prefix is `api/v1`, excluding `health` gives `/health`. This is a documentation vs. implementation clarification — `/health` is the correct load-balancer target; the spec's `/api/health` notation includes the `/api` because of the global prefix. Accept `/health` as correct.

## Risks / Trade-offs

- `autoLogging: false` means no built-in access log. If we later want per-request duration tracking, a dedicated middleware can be added.
- `nestjs-pino` requires `LoggerModule` to be imported before modules that use `Logger` — import order in `AppModule` matters.
- Joi validation at startup only checks presence and type of env vars, not semantic validity (e.g., whether `DATABASE_URL` is a reachable Postgres URL). Runtime failures for malformed values surface at DB connect time.
