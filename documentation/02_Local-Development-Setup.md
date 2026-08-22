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
| Email | ✅ console logging (no service needed) | ✅ **delivering** via JP IT's SMTP relay (D9), shipped 2026-08-17 |

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

---

## Testing against real services locally

Most of what needs checking can be checked here, in seconds, instead of through a deploy that
takes roughly a quarter of an hour. Two credentials make the full signup path work locally.

### Google sign-in

Already provisioned. The OAuth client shared with pre-production lists
`http://localhost:3001/api/v1/auth/google/callback` among its redirect URIs, and
`apps/api/.env` carries the client id, secret and callback URL. Google sign-in works on `pnpm dev`
with no further setup.

### Outbound email

Optional, and consider whether you want it. **Without SMTP configured the email service prints to
the console** — the verification link appears directly in the API output, which is usually faster
than opening an inbox.

To send real mail, copy the `SMTP_*` and `EMAIL_FROM` values from `~/.secrets/veervrat/smtp-jp.env`
into `apps/api/.env`.

⚠️ `SMTP_SECURE` stays `false`. Port 587 upgrades through STARTTLS; `true` means implicit TLS on
port 465 and fails with an error that does not name the cause.

### Runtime feature configuration

Deployed environments get these from infrastructure definitions; locally they belong in
`apps/api/.env` and `apps/web/.env.local`:

```
ENVIRONMENT="local"          # content editing is refused outright when this is "prod"
FEEDBACK_MODE="granted"      # off | granted — matches both deployed environments
CONTENT_EDIT_ENABLED="true"  # whether the feature exists here; who may use it is a per-user grant
```

⚠️ Not `NEXT_PUBLIC_*`. Those are inlined at build time and one image serves every environment,
so anything baked cannot differ between them.

---

## Running the built image locally

`pnpm dev` cannot show a build-time configuration fault, because it reads the environment at
runtime. A built image can — and building one takes about three minutes against a deploy cycle of
roughly fifteen. Worth doing before pushing anything that touches configuration, the Dockerfile,
or how a per-environment value reaches the browser.

```bash
docker build -f apps/web/Dockerfile -t veervrat-web:local .        # ~3 min

docker run -d --name veervrat-web-local -p 3100:3000 \
  -e API_BASE_URL="http://host.docker.internal:3001/api/v1" \
  -e SITE_URL="http://localhost:3100" \
  -e ENVIRONMENT="local" \
  -e FEEDBACK_MODE="granted" \
  -e CONTENT_EDIT_ENABLED="true" \
  -e PORT=3000 \
  veervrat-web:local

curl -s http://localhost:3100/signup | head -c 200
docker rm -f veervrat-web-local        # it is a check, not a second environment
```

Three details that are easy to get wrong:

- **Port 3100, not 3000.** The dev server holds 3000, and two things bound to one port fail in a
  way that looks like the image being broken.
- **`host.docker.internal`, not `localhost`.** Inside the container, `localhost` is the container.
  The API runs on the host.
- **Every per-environment value is passed at `docker run`, not at `docker build`.** That is the
  point of the exercise, and the shape of the deployed system: one image, configured on start.

### What this specifically catches

**A value that was baked when it should not have been.** The check is that a runtime value
actually reaches the browser. With the API base above, the served page should reference
`host.docker.internal:3001` — a value supplied at `docker run`. If it instead shows whatever was
present at build time, something is being inlined that must not be.

```bash
curl -s http://localhost:3100/signup | grep -c "host.docker.internal:3001"   # expect ≥ 1
```

That is the defect behind conventions §17, and it has occurred three times: an API origin baked
into rewrite rules so production addressed the pre-production database; a site URL baked so link
previews pointed at the wrong environment; and a feature flag baked so a feature was compiled out
of every deployed build.

⚠️ Still not covered here: cookies on a real domain, `Secure`/`SameSite` under HTTPS, and the
deployment machinery itself. See below.

## What local testing proves, and what it does not

Running locally is the fast loop and should be the default. It is not equivalent to a deployed
environment, and the differences are not academic — each has produced a real defect.

**Reliable locally:** interface behaviour, form validation, translation keys, business logic, API
contracts, database queries and migrations.

**NOT reliable locally:**

| | Why |
|---|---|
| **Cookies and sessions** | `localhost` shares cookies across ports, so a missing cookie `Domain` cannot be seen. Login worked locally and did not survive a refresh once deployed |
| **`Secure` / `SameSite`** | Both depend on HTTPS, which `pnpm dev` does not use |
| **Build-time configuration** | `pnpm dev` reads the environment at runtime, so a baked value looks correct. Only a built image shows it — see "Running the built image locally" above, which is the cheap way to check |
| **Deployment machinery** | Migration and seed jobs, infrastructure changes, the promotion path |
| **Cold start** | Local processes are always warm |

**The rule that follows:** verify locally first, and reserve a deploy for what only a deployed
artifact can prove. A green local run is not evidence about the four rows above — say which was
actually checked rather than "it works".

