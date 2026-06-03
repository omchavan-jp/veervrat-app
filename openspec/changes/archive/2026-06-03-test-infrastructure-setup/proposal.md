## Why

No test infrastructure exists in the project yet. Before any feature implementation begins, the testing stack must be configured so that every subsequent change is built with tests from day one — not retrofitted later.

## What Changes

- Add Vitest to `apps/api` with supertest for NestJS unit and integration tests
- Add Vitest + React Testing Library to `apps/web` for frontend component tests
- Add Playwright for E2E tests across the full stack
- Add a `veervrat_test` database to `docker-compose.yml` for integration tests (isolated from dev DB)
- Add `vitest.config.ts` to both apps
- Add a supertest helper for NestJS integration tests
- Add first passing smoke test (DB connection) to validate the setup
- Add pnpm test scripts to root `package.json` and both app `package.json`s

## Capabilities

### New Capabilities
- `test-infrastructure`: Vitest (unit + integration for NestJS, component for Next.js), Playwright (E2E), test DB, supertest helper, smoke test

### Modified Capabilities
- `auth`: First auth smoke test added to validate the test setup end-to-end (no spec requirement change — implementation detail only)

## Impact

- `docker-compose.yml` — add `postgres-test` service on port 5434
- `apps/api/package.json` — add vitest, @vitest/coverage-v8, supertest, @types/supertest
- `apps/web/package.json` — add vitest, @vitejs/plugin-react, @testing-library/react, @testing-library/user-event, jsdom
- Root `package.json` — add playwright, test script aliases
- `apps/api/vitest.config.ts` — new file
- `apps/web/vitest.config.ts` — new file
- `playwright.config.ts` — new file at root
- `apps/api/src/test/` — supertest helper, smoke test
- `.env.test` — test DB connection string
