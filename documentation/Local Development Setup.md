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

## 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5433` with:
- User: `veervrat`
- Password: `veervrat_local`
- Database: `veervrat`

Verify it's running:
```bash
docker compose ps
```

## 3. Set up environment variables

### Backend (`apps/api`)
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and fill in:
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `SESSION_SECRET` — any random string (32+ chars)

The `DATABASE_URL` defaults match the docker-compose configuration.

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

If starting fresh (no migrations yet), create the first migration:
```bash
npx prisma migrate dev --name init
```

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

| Service | Local | Status |
|---|---|---|
| PostgreSQL | docker-compose, port 5432 | Set up |
| Meilisearch | will be added to docker-compose | Not set up yet |
| Object storage | TBD | Not set up yet |
| Email (dev) | console logging, no external service needed | Not set up yet |

## Troubleshooting

**Port conflicts**: if 5432 is taken, change the port mapping in `docker-compose.yml` and update `DATABASE_URL` in `.env`.

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
