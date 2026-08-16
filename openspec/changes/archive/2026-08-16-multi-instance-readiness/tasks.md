## 0. Housekeeping (unblocks CI before anything else)

- [x] 0.1 Remove the hardcoded `version: 11.1.3` from the `pnpm/action-setup` step in
  `.github/workflows/ci.yml` and `.github/workflows/integration.yml`, so the action reads
  `packageManager` from `package.json` (currently `pnpm@11.18.0`). With both set and
  disagreeing, the action errors and CI cannot run.
- [x] 0.2 Commit the pending `.gitignore` change in `apps/api` (`.env*` plus
  `!.env.example`), which prevents committing files like `.env.railway`.
- [x] 0.3 Commit the pending `packageManager` bump in root `package.json`.

## 1. Dependencies

- [x] 1.1 Add `@nest-lab/throttler-storage-redis@^1.2.0` and
  `@socket.io/redis-adapter@^8.3.0` to `apps/api/package.json`; `pnpm install`.
- [x] 1.2 Confirm the approved library catalog entries in
  `documentation/10_Platform-Engineering-Standard.md` are present (done in the research
  phase — verify they survived the merge).

## 2. Graceful shutdown

- [x] 2.1 In `main.ts`, call `app.enableShutdownHooks()` before `app.listen()`.
- [x] 2.2 Register `SIGTERM`/`SIGINT` handlers that call `app.close()`, guarded so repeated
  signals do not re-enter, and force `process.exit` after `SHUTDOWN_TIMEOUT_MS`
  (default 10000) if close has not settled.
- [x] 2.3 Log shutdown start and completion through the Nest logger, so container logs show
  why the process exited.
- [x] 2.4 Add `SHUTDOWN_TIMEOUT_MS` to the Joi config schema (optional, positive integer,
  default 10000) and to `apps/api/.env.example`.

## 3. Distributed rate limiting

- [x] 3.1 Convert `ThrottlerModule.forRoot([...])` in `app.module.ts` to `forRootAsync`,
  injecting `REDIS_CLIENT`, keeping the existing `{ name: 'global', ttl: 60000, limit: 300 }`
  values unchanged.
- [x] 3.2 Use `ThrottlerStorageRedisService` with the injected client when `REDIS_URL` is
  configured; otherwise omit `storage` so the default in-memory storage is used, and log a
  startup warning that rate limiting is per-process only.
- [x] 3.3 Verify per-route `@Throttle()` overrides on the auth endpoints still apply.
  **They did not, and had not before this change.** The throttler was named `global` while
  every `@Throttle({ default: ... })` writes metadata under `default`; the guard looks up
  overrides by the throttler's own name, so none matched and the auth routes silently used
  the 300/min global bucket. Confirmed against a running server (8/8 `forgot-password`
  requests returned 200 where the 6th should have been 429). Renaming the throttler to
  `default` fixes it — verified 6th request now returns 429, counters visible in Redis.
- [x] 3.4 Point `.env.test` at Redis DB 1, so test counters, lockouts and cache no longer
  share state with the dev instance.
- [x] 3.5 Give real integration coverage to enforcement instead of disabling it for tests.
  A global `beforeEach` (`src/test/setup.ts`) flushes only throttler-namespaced Redis keys
  before every integration test, so counters no longer leak between tests/files while the
  throttler itself stays fully live. Added `auth.integration.spec.ts` → "Rate limiting":
  confirms the 6th `forgot-password` request within the limit returns 429, and that a
  counter actually lands in Redis (not just "a limit — possibly in-memory — fired").
  Found in the process: the `/login` route's IP throttle (10 req/15min) and the
  email-based account-lockout threshold (10 failed attempts) use the same count, and the
  throttler guard runs before the lockout check — so once 3.3's fix made the throttler
  real, it started shadowing the lockout test 11th request with a generic 429 instead of
  `ACCOUNT_LOCKED`. Fixed the test by resetting the IP-throttle counter (not the lockout
  counter) between the setup loop and the final assertion; the underlying shadowing is a
  real production behavior and is filed in `backlog.md`, not silently resolved here.

## 4. WebSocket Redis adapter

- [x] 4.1 Add a `RedisIoAdapter extends IoAdapter` that duplicates `REDIS_CLIENT` twice
  (pub + sub), connects both, and calls `createAdapter(pub, sub)` in `createIOServer`.
- [x] 4.2 Wire it in `main.ts` via `app.useWebSocketAdapter(...)` only when `REDIS_URL` is
  configured; otherwise leave the default in-memory adapter in place.
- [x] 4.3 Ensure the duplicated clients are disconnected during shutdown (task 2), so they
  do not keep the process alive.
- [x] 4.4 Confirm existing gateway CORS/auth behaviour is unaffected.

## 5. Database connection pooling

- [x] 5.1 In `PrismaService`, construct `PrismaPg` with an explicit pool config
  (`{ connectionString, max }`), `max` from `DATABASE_POOL_MAX` (default 10).
- [x] 5.2 Add `DATABASE_POOL_MAX` to the Joi config schema (optional, positive integer,
  default 10) so a malformed value fails at boot.
- [x] 5.3 Document the sizing rule in `apps/api/.env.example`:
  `DATABASE_POOL_MAX × maxReplicas + headroom ≤ server max_connections`.

## 6. Tests

- [x] 6.1 Shutdown: hooks are enabled and a `SIGTERM` handler is registered; the force-exit
  timeout fires when close does not settle.
- [x] 6.2 Throttler: Redis storage is selected when `REDIS_URL` is set; in-memory fallback
  plus warning when it is not; configured limits unchanged in both cases.
- [x] 6.3 Socket adapter: `createIOServer` installs the Redis adapter and duplicates the
  client twice when `REDIS_URL` is set; default adapter when unset.
- [x] 6.4 Prisma: pool `max` reflects `DATABASE_POOL_MAX`; defaults to 10 when unset.
- [x] 6.5 Config: invalid `DATABASE_POOL_MAX` / `SHUTDOWN_TIMEOUT_MS` fail validation.
- [x] 6.6 Existing auth-throttle tests still pass unchanged.

## 7. Verify

- [x] 7.1 `pnpm --filter api test:unit` green.
- [x] 7.2 `pnpm --filter api test` (incl. integration, real Postgres + Redis) green.
- [x] 7.3 `pnpm typecheck` and `pnpm lint` clean across api/web/types.
- [x] 7.4 `pnpm build` succeeds for both apps.
- [x] 7.5 Boot the API locally **with Redis** — confirm no warning, and log lines show the
  Redis throttler storage and Redis socket adapter in use.
- [x] 7.6 Boot the API locally **without Redis** — confirm it still starts, serves requests,
  and logs the per-process warning (this is the local-dev regression risk).
- [x] 7.7 Send `SIGTERM` to the local process during an in-flight request; confirm the
  request completes, Prisma disconnects, and the process exits without `SIGKILL`.
- [x] 7.8 Update `CHANGELOG.md` — one line, phrased for a user (deploys no longer interrupt
  in-flight requests).
