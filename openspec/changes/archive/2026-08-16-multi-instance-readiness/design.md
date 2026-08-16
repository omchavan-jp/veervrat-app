## Context

The API runs today as a single, long-lived process. Two properties of Azure Container Apps
break that assumption:

- **Revisions are replaced by signal.** The platform sends `SIGTERM`, waits a grace period,
  then `SIGKILL`s. A process that ignores `SIGTERM` is killed mid-request.
- **Replicas may exceed one.** Consumption-plan scaling adds replicas under load and removes
  them when idle (including to zero).

Existing building blocks this change reuses rather than replaces:

- `RedisModule` is `@Global()` and exports a single `ioredis` client under the token
  `REDIS_CLIENT`. It is constructed with `lazyConnect: true` and attaches an `error` handler
  that **logs a warning instead of throwing**, so a missing local Redis degrades rather than
  crashes. Any new Redis consumer must preserve that property.
- `ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 300 }])` in `app.module.ts`,
  with per-route overrides via `@Throttle()` on auth endpoints.
- `PrismaService extends PrismaClient` using the driver adapter
  `new PrismaPg(process.env.DATABASE_URL!)`, with `onModuleInit`/`onModuleDestroy` already
  written (the latter currently dead code).
- `ChatsGateway` is a standard `@WebSocketGateway()` exposing `@WebSocketServer() server`.

## Goals / Non-Goals

**Goals:**
- Deploys stop interrupting in-flight requests.
- Rate limits behave identically regardless of replica count or deploy history.
- Socket.IO broadcasts are correct with more than one replica.
- Total DB connections are bounded and configurable.
- Local development continues to work with no Redis running.

**Non-Goals:**
- Actually scaling past one replica (chat readiness is a separate work packet).
- Any change to rate-limit *values* — only where the counters are stored.
- Chat features, reconnection semantics, or delivery guarantees.
- Migrating object storage, removing the Next.js proxy, or Key Vault — all Round 3, at cutover.

## Decisions

1. **`enableShutdownHooks()` plus an explicit signal handler, not one or the other.**
   `enableShutdownHooks()` alone makes Nest listen for process signals and run
   `onModuleDestroy`/`onApplicationShutdown`. But `app.close()` resolves only once handlers
   finish, and the platform's grace period is finite. Register an explicit handler that calls
   `app.close()` and force-exits after `SHUTDOWN_TIMEOUT_MS` (default 10s), so a hung handler
   cannot hold the container open until `SIGKILL`. Nest's own hook does the graceful part;
   the timeout is the backstop.

2. **Redis throttler storage, degrading to in-memory when Redis is absent.**
   `@nest-lab/throttler-storage-redis` accepts an existing `ioredis` instance, so it reuses
   `REDIS_CLIENT` rather than opening a second connection pool. `ThrottlerModule.forRootAsync`
   is required (the current `forRoot` cannot inject). **Local dev must not break:** when
   `REDIS_URL` is unset, fall back to the default in-memory storage rather than wiring a
   client that will never connect. Per-instance limiting is correct for a single local
   process; it is only wrong in production, where Redis is always present.

3. **Adapter registration in `main.ts`, not inside the gateway.**
   Socket.IO adapters are set on the server before it starts accepting connections. The
   idiomatic NestJS approach is a custom `IoAdapter` subclass passed to `app.useWebSocketAdapter()`,
   which is cleaner than mutating `gateway.server` in `afterInit`. `@socket.io/redis-adapter`
   requires **two** clients (one publishing, one subscribed) because a Redis connection in
   subscriber mode cannot issue other commands — so `REDIS_CLIENT.duplicate()` twice rather
   than sharing the injected client. Both are connected eagerly during adapter creation, since
   an unconnected pub/sub pair fails silently rather than loudly.

4. **Pool ceiling via adapter config, sized per replica.**
   `PrismaPg` accepts pg `PoolConfig`, so pass `{ connectionString, max }` with `max` from
   `DATABASE_POOL_MAX` (default 10, preserving today's effective behaviour). The operative
   arithmetic is `max × maxReplicas + migrations/admin headroom ≤ server max_connections`;
   the default is deliberately conservative and the value is documented in `.env.example` so
   it can be tuned when replica counts are chosen at deploy time. Reading it via
   `ConfigService` is not possible here without restructuring `PrismaService`'s constructor,
   so it is read from `process.env` consistently with the existing `DATABASE_URL` read, and
   validated in the Joi schema so a malformed value fails fast at boot.

5. **CI pnpm pin removed rather than re-pinned.**
   `pnpm/action-setup@v4` errors when both an explicit `version:` and a `packageManager` field
   are present and disagree. Deleting `version:` makes `package.json` the single source of
   truth, so the two cannot drift again — which is the actual defect, not the specific version.

## Risks / Trade-offs

- **Throttler fallback could mask a production misconfiguration.** If `REDIS_URL` were
  somehow unset in production, limits would silently become per-instance again. Mitigated by
  logging a warning at boot when falling back, and by `REDIS_URL` already being a required
  variable in the production config schema.
- **Two extra Redis connections per replica** for the socket adapter. Negligible for Azure
  Cache Basic C0, but worth noting against Redis connection limits when replica counts rise.
- **`DATABASE_POOL_MAX` default of 10 is a guess until the Postgres tier is chosen.** It
  matches current behaviour, so it cannot regress anything; it will be tuned when the server
  SKU and max-replica count are fixed in Terraform.
- **Graceful shutdown is hard to test meaningfully in unit tests.** Coverage asserts the
  wiring (hooks enabled, handler registered, timeout honoured) rather than true signal
  behaviour, which is better verified once running on Container Apps.

## Migration Plan

No data migration. Changes are additive and backwards-compatible: all new env vars are
optional with defaults matching current behaviour, so the existing deployment topology keeps
working unchanged. Rollback is a revert — no state to unwind.

## Open Questions

- Final `DATABASE_POOL_MAX` and `maxReplicas` values, deferred to the Terraform work when the
  Postgres SKU is chosen.
