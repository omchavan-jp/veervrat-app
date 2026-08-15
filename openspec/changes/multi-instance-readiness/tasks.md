## 0. Housekeeping (unblocks CI before anything else)

- [ ] 0.1 Remove the hardcoded `version: 11.1.3` from the `pnpm/action-setup` step in
  `.github/workflows/ci.yml` and `.github/workflows/integration.yml`, so the action reads
  `packageManager` from `package.json` (currently `pnpm@11.18.0`). With both set and
  disagreeing, the action errors and CI cannot run.
- [ ] 0.2 Commit the pending `.gitignore` change in `apps/api` (`.env*` plus
  `!.env.example`), which prevents committing files like `.env.railway`.
- [ ] 0.3 Commit the pending `packageManager` bump in root `package.json`.

## 1. Dependencies

- [ ] 1.1 Add `@nest-lab/throttler-storage-redis@^1.2.0` and
  `@socket.io/redis-adapter@^8.3.0` to `apps/api/package.json`; `pnpm install`.
- [ ] 1.2 Confirm the approved library catalog entries in
  `documentation/10_Platform-Engineering-Standard.md` are present (done in the research
  phase — verify they survived the merge).

## 2. Graceful shutdown

- [ ] 2.1 In `main.ts`, call `app.enableShutdownHooks()` before `app.listen()`.
- [ ] 2.2 Register `SIGTERM`/`SIGINT` handlers that call `app.close()`, guarded so repeated
  signals do not re-enter, and force `process.exit` after `SHUTDOWN_TIMEOUT_MS`
  (default 10000) if close has not settled.
- [ ] 2.3 Log shutdown start and completion through the Nest logger, so container logs show
  why the process exited.
- [ ] 2.4 Add `SHUTDOWN_TIMEOUT_MS` to the Joi config schema (optional, positive integer,
  default 10000) and to `apps/api/.env.example`.

## 3. Distributed rate limiting

- [ ] 3.1 Convert `ThrottlerModule.forRoot([...])` in `app.module.ts` to `forRootAsync`,
  injecting `REDIS_CLIENT`, keeping the existing `{ name: 'global', ttl: 60000, limit: 300 }`
  values unchanged.
- [ ] 3.2 Use `ThrottlerStorageRedisService` with the injected client when `REDIS_URL` is
  configured; otherwise omit `storage` so the default in-memory storage is used, and log a
  startup warning that rate limiting is per-process only.
- [ ] 3.3 Verify per-route `@Throttle()` overrides on the auth endpoints still apply.

## 4. WebSocket Redis adapter

- [ ] 4.1 Add a `RedisIoAdapter extends IoAdapter` that duplicates `REDIS_CLIENT` twice
  (pub + sub), connects both, and calls `createAdapter(pub, sub)` in `createIOServer`.
- [ ] 4.2 Wire it in `main.ts` via `app.useWebSocketAdapter(...)` only when `REDIS_URL` is
  configured; otherwise leave the default in-memory adapter in place.
- [ ] 4.3 Ensure the duplicated clients are disconnected during shutdown (task 2), so they
  do not keep the process alive.
- [ ] 4.4 Confirm existing gateway CORS/auth behaviour is unaffected.

## 5. Database connection pooling

- [ ] 5.1 In `PrismaService`, construct `PrismaPg` with an explicit pool config
  (`{ connectionString, max }`), `max` from `DATABASE_POOL_MAX` (default 10).
- [ ] 5.2 Add `DATABASE_POOL_MAX` to the Joi config schema (optional, positive integer,
  default 10) so a malformed value fails at boot.
- [ ] 5.3 Document the sizing rule in `apps/api/.env.example`:
  `DATABASE_POOL_MAX × maxReplicas + headroom ≤ server max_connections`.

## 6. Tests

- [ ] 6.1 Shutdown: hooks are enabled and a `SIGTERM` handler is registered; the force-exit
  timeout fires when close does not settle.
- [ ] 6.2 Throttler: Redis storage is selected when `REDIS_URL` is set; in-memory fallback
  plus warning when it is not; configured limits unchanged in both cases.
- [ ] 6.3 Socket adapter: `createIOServer` installs the Redis adapter and duplicates the
  client twice when `REDIS_URL` is set; default adapter when unset.
- [ ] 6.4 Prisma: pool `max` reflects `DATABASE_POOL_MAX`; defaults to 10 when unset.
- [ ] 6.5 Config: invalid `DATABASE_POOL_MAX` / `SHUTDOWN_TIMEOUT_MS` fail validation.
- [ ] 6.6 Existing auth-throttle tests still pass unchanged.

## 7. Verify

- [ ] 7.1 `pnpm --filter api test:unit` green.
- [ ] 7.2 `pnpm --filter api test` (incl. integration, real Postgres + Redis) green.
- [ ] 7.3 `pnpm typecheck` and `pnpm lint` clean across api/web/types.
- [ ] 7.4 `pnpm build` succeeds for both apps.
- [ ] 7.5 Boot the API locally **with Redis** — confirm no warning, and log lines show the
  Redis throttler storage and Redis socket adapter in use.
- [ ] 7.6 Boot the API locally **without Redis** — confirm it still starts, serves requests,
  and logs the per-process warning (this is the local-dev regression risk).
- [ ] 7.7 Send `SIGTERM` to the local process during an in-flight request; confirm the
  request completes, Prisma disconnects, and the process exits without `SIGKILL`.
- [ ] 7.8 Update `CHANGELOG.md` — one line, phrased for a user (deploys no longer interrupt
  in-flight requests).
