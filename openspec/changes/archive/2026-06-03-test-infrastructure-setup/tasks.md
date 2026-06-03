## 1. Test Database Setup

- [x] 1.1 Add `postgres-test` service to `docker-compose.yml` (port 5434, DB name `veervrat_test`, same credentials as dev)
- [x] 1.2 Create `apps/api/.env.test` with `DATABASE_URL` pointing to port 5434 (`veervrat_test`)
- [x] 1.3 Run `docker compose up -d` and verify `veervrat_test` database is accessible
- [x] 1.4 Run `prisma migrate deploy` against test DB using `.env.test`

## 2. Backend — Vitest Setup

- [x] 2.1 Install dev dependencies in `apps/api`: `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`, `vite-tsconfig-paths`
- [x] 2.2 Create `apps/api/vitest.config.ts` — two projects: `unit` (no DB, fast) and `integration` (uses `.env.test`, real DB)
- [x] 2.3 Add test scripts to `apps/api/package.json`: `"test"`, `"test:unit"`, `"test:integration"`, `"test:coverage"`
- [x] 2.4 Create `apps/api/src/test/setup.ts` — global setup: load `.env.test`, connect Prisma to test DB
- [x] 2.5 Create `apps/api/src/test/helpers/app.helper.ts` — supertest helper that bootstraps the full NestJS app, exposes `request(app.getHttpServer())`, provides `testPrisma` with transaction rollback
- [x] 2.6 Create `apps/api/src/test/smoke.spec.ts` — first integration smoke test: connects to DB, queries `_prisma_migrations`, expects at least one row

## 3. Frontend — Vitest + RTL Setup

- [x] 3.1 Install dev dependencies in `apps/web`: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
- [x] 3.2 Create `apps/web/vitest.config.ts` — jsdom environment, `@testing-library/jest-dom` setup file, path aliases matching tsconfig
- [x] 3.3 Create `apps/web/src/test/setup.ts` — imports `@testing-library/jest-dom`
- [x] 3.4 Add test scripts to `apps/web/package.json`: `"test"`, `"test:coverage"`
- [x] 3.5 Create a first passing component smoke test — render a basic `<Button>` and assert it appears in the document

## 4. Playwright Setup

- [x] 4.1 Install Playwright at repo root: `pnpm add -D @playwright/test`
- [x] 4.2 Run `npx playwright install chromium` to install the Chromium browser
- [x] 4.3 Create `playwright.config.ts` at repo root — baseURL `http://localhost:3000`, webServer entries for both frontend and backend, output to `e2e/results/`
- [x] 4.4 Create `e2e/` directory at repo root with `.gitkeep`
- [x] 4.5 Add `"test:e2e": "playwright test"` script to root `package.json`

## 5. Root pnpm Scripts

- [x] 5.1 Add to root `package.json` scripts: `"test": "turbo run test"`, `"test:e2e": "playwright test"`
- [x] 5.2 Add `test` task to `turbo.json` with correct cache configuration (inputs: `src/**`, outputs: `coverage/**`)

## 6. Documentation Update

- [x] 6.1 Update `documentation/Local Development Setup.md` — add section: "Running tests", with commands for unit, integration, and E2E; note that `npx playwright install chromium` is required once

## 7. Verify End-to-End

- [x] 7.1 Run `pnpm --filter api test` — all tests pass (smoke test green)
- [x] 7.2 Run `pnpm --filter web test` — component smoke test passes
- [x] 7.3 Run `pnpm test` from root — both apps' tests run via Turborepo
- [x] 7.4 Confirm test DB is isolated — dev DB on 5433 unchanged after test run
