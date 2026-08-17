# Local Development Setup

## Prerequisites

- **Node.js** >= 20
- **pnpm** (`npm install -g pnpm`)
- **Docker** (for PostgreSQL)
- **Git**

## 1. Clone and install

```bash
cd veervrat-app
pnpm install
```

## 2. Start the local services

```bash
docker compose up -d
docker compose ps          # verify all are running
```

This starts **six** containers, not just Postgres:

| Service | Port | Notes |
|---|---|---|
| `veervrat-postgres` | **5433** | dev DB — user `veervrat` / pass `veervrat_local` / db `veervrat` |
| `veervrat-postgres-test` | **5434** | test DB — `veervrat_test`. Never point `.env` at this |
| `veervrat-redis` | **6380** | rate limits, account lockout, cache, Socket.IO adapter |
| `veervrat-meilisearch` | 7700 | search (deployed nowhere — local only) |
| `veervrat-minio` | 9000/9001 | S3-compatible object storage for uploads |
| `veervrat-pgadmin` | 5050 | optional DB UI |

⚠️ **Port 5433, not the Postgres default 5432** — chosen so it does not collide with a
system Postgres. `DATABASE_URL` in `.env.example` already matches.

## 3. Set up environment variables

### Backend (`apps/api`)
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and fill in:
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `SESSION_SECRET` — any random string (32+ chars)

⚠️ **The two `GOOGLE_*` values are read with `getOrThrow` and are *not* in the Joi schema**,
so leaving them empty crash-loops the API at boot with no friendly error. Any placeholder
string works for local dev if you are not testing Google sign-in.

`DATABASE_URL` and `REDIS_URL` defaults already match docker-compose. Optional tuning knobs
with sane defaults: `DATABASE_POOL_MAX` (10) and `SHUTDOWN_TIMEOUT_MS` (10000).

### Frontend (`apps/web`)
```bash
cp apps/web/.env.example apps/web/.env
```

Defaults are fine for local development.

## 4. Set up the database

Generate the Prisma client and run migrations:
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

Then **seed the reference content** — without it the app runs but is unusable, because there
are no virtues, weaknesses or sentences to take a test against:

```bash
pnpm seed        # from apps/api/
```

Idempotent (upserts), so it is safe to re-run.

## 5. Start development servers

From the repo root:
```bash
pnpm turbo dev
```

This starts both:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health check**: http://localhost:3001/api/v1/health

Or start them individually:
```bash
pnpm --filter web dev    # frontend only
pnpm --filter api start:dev   # backend only
```

## 6. Useful commands

| Command | What it does |
|---|---|
| `pnpm turbo build` | Build all apps |
| `pnpm turbo dev` | Start all dev servers |
| `pnpm turbo lint` | Lint all apps |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without changing files |
| `pnpm --filter api start:dev` | Start NestJS in watch mode |
| `pnpm --filter web dev` | Start Next.js dev server |
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL (data persists) |
| `docker compose down -v` | Stop PostgreSQL and delete data |

### Prisma commands (run from `apps/api/`)
| Command | What it does |
|---|---|
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma migrate reset` | Reset database (drop all data, reapply migrations) |
| `npx prisma studio` | Open Prisma Studio (visual DB editor) |
| `npx prisma db push` | Push schema to DB without creating a migration (dev only) |

## Infrastructure services

| Service | Local | Deployed |
|---|---|---|
| PostgreSQL | ✅ docker-compose, port **5433** | ✅ Azure Flexible Server v18 |
| Redis | ✅ docker-compose, port 6380 | ✅ Azure Managed Redis |
| Meilisearch | ✅ docker-compose, port 7700 | ❌ deferred — search degrades gracefully |
| Object storage | ✅ MinIO, ports 9000/9001 | ❌ Azure Blob decided, not implemented (O15) |
| Email | ✅ console logging (no service needed) | ❌ not wired — JP IT's SMTP relay chosen (D9), code swap pending (B14) |

## Troubleshooting

**Port conflicts**: if 5433 (dev DB), 5434 (test DB) or 6380 (Redis) are taken, change the
port mapping in `docker-compose.yml` and update `DATABASE_URL` / `REDIS_URL` to match.

**API crash-loops immediately at boot**: check `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are
non-empty — they bypass config validation and throw before any friendly error is produced.

**Prisma client errors after schema change**: run `npx prisma generate` from `apps/api/`.

**Docker not running**: make sure Docker Desktop (or equivalent) is running before `docker compose up`.

## Running Tests

### First-time setup
```bash
# Install Playwright browser (required once)
npx playwright install chromium

# Start test database
docker compose up -d postgres-test

# Apply migrations to test DB
cd apps/api && DATABASE_URL="postgresql://veervrat:veervrat_local@localhost:5434/veervrat_test?schema=public" npx prisma migrate deploy
```

### Commands

| Command | What it runs |
|---|---|
| `pnpm --filter api test` | All API tests (unit + integration) |
| `pnpm --filter api test:unit` | Unit tests only (fast, no DB) |
| `pnpm --filter api test:integration` | Integration tests against test DB |
| `pnpm --filter web test` | Frontend component tests |
| `pnpm test` | All tests across both apps (via Turborepo) |
| `pnpm test:e2e` | E2E tests (requires both servers running) |

### Test database
- Dev DB: `localhost:5433` (database: `veervrat`)
- Test DB: `localhost:5434` (database: `veervrat_test`)
- Test DB connection string is in `apps/api/.env.test` — never modify this to point at the dev DB.
- `.env.test` also uses **Redis DB 1** (`redis://localhost:6380/1`) so test rate-limit counters,
  lockouts and cache never touch your dev instance. The integration suite flushes only
  throttler-namespaced keys before each test.
