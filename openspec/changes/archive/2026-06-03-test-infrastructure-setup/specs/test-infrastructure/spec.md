## ADDED Requirements

### Requirement: Backend unit and integration test runner
The system SHALL use Vitest as the test runner for `apps/api`. Unit tests target the service layer only. Integration tests hit a real PostgreSQL test database (`veervrat_test` on port 5434) — no mocks for the database layer.

#### Scenario: Unit tests run in isolation
- **WHEN** `pnpm --filter api test` is executed
- **THEN** Vitest runs all `.spec.ts` files in `apps/api/src`, services are tested without Prisma or external dependencies

#### Scenario: Integration tests use real test DB
- **WHEN** integration tests reference the test DB
- **THEN** the test DB is seeded, tests run against it, and the DB is cleaned up after each suite via transaction rollback or truncation

#### Scenario: Smoke test passes on fresh setup
- **WHEN** the test suite runs for the first time on a fresh environment
- **THEN** the DB connection smoke test passes, confirming Prisma can connect to the test database

### Requirement: Frontend component test runner
The system SHALL use Vitest + React Testing Library for `apps/web` component tests. Tests run in jsdom environment.

#### Scenario: Component tests run without a browser
- **WHEN** `pnpm --filter web test` is executed
- **THEN** Vitest runs all `.test.tsx` files in `apps/web`, React components render in jsdom without requiring a real browser

### Requirement: E2E test runner
The system SHALL use Playwright for end-to-end tests. E2E tests run against a real browser, hitting the running frontend and backend.

#### Scenario: Playwright config targets local dev servers
- **WHEN** `pnpm test:e2e` is executed
- **THEN** Playwright launches Chromium, connects to `http://localhost:3000` (web) and `http://localhost:3001` (api), and runs all spec files in `e2e/`

### Requirement: Test database isolation
The system SHALL provide a dedicated `veervrat_test` PostgreSQL database for integration tests, isolated from the development database.

#### Scenario: Test DB exists alongside dev DB
- **WHEN** `docker compose up -d` is run
- **THEN** both `veervrat` (dev, port 5433) and `veervrat_test` (test, port 5434) databases are available

#### Scenario: Test DB connection string is separate
- **WHEN** integration tests run
- **THEN** they use `DATABASE_URL` from `.env.test` pointing to port 5434, never touching the dev DB on port 5433

### Requirement: Supertest helper for NestJS API tests
The system SHALL provide a supertest helper that bootstraps the full NestJS application for API-level integration tests.

#### Scenario: API test can make authenticated requests
- **WHEN** an integration test uses the supertest helper
- **THEN** it can create a test user, create a session, and make authenticated HTTP requests to any route

### Requirement: pnpm test scripts at all levels
The system SHALL expose consistent test commands at root and per-app level.

#### Scenario: Root-level test commands work
- **WHEN** `pnpm test` is run from the repo root
- **THEN** all unit and integration tests across both apps run in parallel via Turborepo

#### Scenario: Per-app test commands work
- **WHEN** `pnpm --filter api test` or `pnpm --filter web test` is run
- **THEN** only that app's tests run
