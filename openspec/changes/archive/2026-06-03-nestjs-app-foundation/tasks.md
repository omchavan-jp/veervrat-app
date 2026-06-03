## 1. Update Approved Library Catalog

- [x] 1.1 Add `nestjs-pino`, `pino-http`, `pino-pretty`, `joi` to the Approved Library Catalog table in `documentation/Platform-Engineering-Standard.md` with rationale

## 2. Install Dependencies

- [x] 2.1 Install `nestjs-pino` and `pino-http` in `apps/api`
- [x] 2.2 Install `pino-pretty` as a dev dependency in `apps/api`
- [x] 2.3 Install `joi` in `apps/api`

## 3. Config Validation

- [x] 3.1 Add Joi validation schema to `apps/api/src/config/config.module.ts` — required: `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_URL`; optional with defaults: `PORT` (3001), `LOG_LEVEL` (`info`), `NODE_ENV` (`development`)
- [x] 3.2 Pass `validationOptions: { abortEarly: false }` so all missing vars are reported together

## 4. Pino Logging

- [x] 4.1 Import `LoggerModule.forRoot(...)` from `nestjs-pino` in `apps/api/src/app.module.ts` — first import in the array. Config: `autoLogging: false`, `redact: ['req.headers.cookie', 'req.body.password']`, log level from `process.env.LOG_LEVEL ?? 'info'`, pino-pretty transport when `NODE_ENV !== 'production'`
- [x] 4.2 In `apps/api/src/main.ts` call `app.useLogger(app.get(Logger))` (from `nestjs-pino`) after `NestFactory.create`

## 5. Correlation ID Middleware

- [x] 5.1 Create `apps/api/src/common/middleware/correlation-id.middleware.ts` — reads `X-Correlation-Id` request header or generates a `uuid` v4; sets `X-Correlation-Id` on response; calls `logger.assign({ correlationId })` on the pino-http request logger
- [x] 5.2 Apply the middleware globally in `AppModule` via `MiddlewareConsumer` (implement `NestModule`, call `consumer.apply(CorrelationIdMiddleware).forRoutes('*')`)

## 6. Fix Health Endpoint Path

- [x] 6.1 In `apps/api/src/main.ts`, update `setGlobalPrefix` to exclude the health route: `app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] })`
- [x] 6.2 Confirm `AppController` `@Get('health')` has no controller-level prefix that would re-add `api/v1`

## 7. Tests

- [x] 7.1 Unit test for `CorrelationIdMiddleware`: UUID generated when header absent; upstream header value reused when present; `X-Correlation-Id` set on response in both cases
- [x] 7.2 Integration test (supertest): `GET /health` → 200 `{ data: { status: 'ok' } }` with no auth
- [x] 7.3 Integration test: `GET /api/v1/health` → 404
- [x] 7.4 Integration test: any `GET /api/v1/...` response is wrapped in `{ data }` (smoke — confirms ResponseInterceptor still works alongside Pino)
