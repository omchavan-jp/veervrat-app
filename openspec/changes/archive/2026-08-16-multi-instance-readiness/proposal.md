## Why

The API was built and operated as a **single instance** on Railway. The move to Azure
Container Apps changes two assumptions at once: revisions are replaced by sending
`SIGTERM` to the running container, and the platform may run **more than one replica**.

A code-grounded audit on 2026-08-15 found four places where the API silently assumes
"exactly one process, running forever". None of them fail loudly — each degrades quietly,
which is what makes them worth fixing before the platform is built around them rather than
after.

1. **No graceful shutdown.** `main.ts` never calls `app.enableShutdownHooks()`, so
   `PrismaService.onModuleDestroy` (which exists) never runs. Every deploy terminates
   in-flight requests and drops database connections mid-query. On Railway this was masked
   by infrequent, manual deploys; on Container Apps every revision change does it.

2. **Rate limiting is per-process.** `ThrottlerModule.forRoot([...])` configures no
   storage, so `@nestjs/throttler` falls back to in-memory counters. With N replicas the
   effective limit becomes N×, and every deploy resets all counters to zero. This governs
   the auth throttles (login, signup, forgot-password, reset-password) — a security control
   that weakens precisely as the system scales, with no error to indicate it.

3. **Socket.IO has no shared backplane.** `chats.gateway.ts` registers no adapter, so room
   membership lives in per-process memory. A message emitted on replica A never reaches a
   client connected to replica B. Chat has never run successfully in production (the
   Next.js rewrite proxy blocked WebSocket upgrades), so this has never been observable.

4. **Database connections are unbounded per replica.** `PrismaService` constructs
   `new PrismaPg(process.env.DATABASE_URL!)` with no pool configuration, defaulting to
   roughly 10 connections per process. Azure Database for PostgreSQL Flexible Server on the
   Burstable tier permits comparatively few connections, so a handful of replicas can
   exhaust the server — at which point every request fails at once, not gradually.

Additionally, CI is currently broken: the workflows pin `pnpm version: 11.1.3` while
`package.json` declares `packageManager: pnpm@11.18.0`, and `pnpm/action-setup` fails when
both are specified and disagree.

## What Changes

- **Graceful shutdown:** enable NestJS shutdown hooks and close the application on
  `SIGTERM`/`SIGINT`, so in-flight requests drain and Prisma/Redis disconnect cleanly.
- **Distributed rate limiting:** back `@nestjs/throttler` with Redis via
  `@nest-lab/throttler-storage-redis`, reusing the existing global `REDIS_CLIENT`, so
  limits are global across replicas and survive deploys.
- **WebSocket backplane:** register `@socket.io/redis-adapter` on the Socket.IO server
  using two duplicated `ioredis` clients, so room broadcasts reach clients on every replica.
- **Connection pooling:** give the Prisma pg adapter an explicit, configurable pool ceiling
  (`DATABASE_POOL_MAX`) so total connections stay within the server's limit as replicas scale.
- **CI fix (small, unblocks the rest):** remove the hardcoded pnpm `version:` from both
  workflows so `pnpm/action-setup` reads `packageManager`; commit the pending `.gitignore`
  hardening (`.env*` with `!.env.example`) that prevents committing files like `.env.railway`.

No API contract changes. No schema changes. No user-visible behaviour change other than
deploys no longer interrupting in-flight requests.

## Capabilities

### New Capabilities

- `graceful-shutdown`: the API terminates cleanly on `SIGTERM`, draining in-flight work and
  releasing external connections before the process exits.
- `distributed-rate-limiting`: rate limits are enforced globally across all replicas and
  persist across deploys, rather than per-process and reset-on-restart.
- `websocket-multi-instance`: Socket.IO room broadcasts reach clients regardless of which
  replica they are connected to.
- `db-connection-pooling`: the API's total database connection usage is bounded and
  configurable, so replica count cannot exhaust the database server.

### Modified Capabilities

_None — no existing specified behaviour changes._

## Impact

- **Code:** `apps/api/src/main.ts` (shutdown hooks), `apps/api/src/app.module.ts`
  (throttler storage), `apps/api/src/modules/chats/chats.gateway.ts` +
  `chats.module.ts` (socket adapter), `apps/api/src/prisma/prisma.service.ts` (pool),
  `apps/api/src/config/config.module.ts` (new optional env vars).
- **Dependencies:** `@nest-lab/throttler-storage-redis` (1.2.0),
  `@socket.io/redis-adapter` (8.3.0). Both already added to the approved library catalog in
  `documentation/10_Platform-Engineering-Standard.md`.
- **Config:** two new optional env vars — `DATABASE_POOL_MAX`, `SHUTDOWN_TIMEOUT_MS`. Both
  have safe defaults; no deployment is required to set them.
- **CI:** `.github/workflows/ci.yml`, `.github/workflows/integration.yml`.
- **Tests:** unit coverage for shutdown wiring, throttler storage selection, adapter
  registration, and pool configuration; existing auth-throttle tests must continue to pass.
- **Local dev:** Redis remains optional-tolerant. `RedisProvider` uses `lazyConnect` and
  logs a warning rather than crashing; the new consumers must not turn a missing local Redis
  into a boot failure.
- **Operational note:** the Socket.IO adapter makes >1 replica *safe*, but chat remains
  unverified in production for unrelated reasons (see the chat production-readiness item in
  `backlog.md`). Replica count for the API should stay at 1 until that work is done.
