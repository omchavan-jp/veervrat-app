## Context

No test infrastructure exists. The project has Prisma, NestJS, and Next.js scaffolded but zero test configuration. All subsequent features will be built test-first, so this must be established before any feature work begins. Refer to `documentation/Testing-Strategy.md` for the full testing philosophy.

## Goals / Non-Goals

**Goals:**
- Vitest configured for `apps/api` (unit + integration) and `apps/web` (component)
- Playwright configured for E2E
- Isolated test DB (`veervrat_test`) available via docker-compose
- Supertest helper bootstrapping the full NestJS app for API tests
- One passing smoke test confirming the DB connection works
- Consistent `pnpm test` commands at root and per-app level

**Non-Goals:**
- Writing feature tests (those come with each feature)
- CI/CD pipeline configuration (separate concern)
- Visual regression testing
- Coverage thresholds (not enforced in v1 per Testing-Strategy.md)

## Decisions

### 1. Vitest over Jest
Vitest is faster, has native ESM support, and shares Vite's config — making it the natural fit for this monorepo. Jest would require extra transformation config for TypeScript + ESM. No real downside for this stack.

### 2. Separate test database, not mocks
Per `documentation/Testing-Strategy.md`: "Integration tests hit a real test DB — no mocks for the database layer." This prevents the class of bugs where mocked behavior diverges from real DB behavior. The test DB runs in the same docker-compose as dev, just on port 5434 with a different DB name.

### 3. Transaction rollback for test isolation
Each integration test suite wraps its operations in a Prisma transaction that is rolled back at the end. This keeps the test DB clean without truncating tables between every test (slow). The supertest helper will expose this as a `testPrisma` transaction client.

### 4. jsdom for frontend component tests
React Testing Library requires a DOM environment. jsdom is the standard choice — lightweight, runs in Node, no browser needed. Playwright handles actual browser testing for E2E.

### 5. Playwright at repo root, not per-app
E2E tests cross the full stack (frontend + backend). Placing `playwright.config.ts` at the repo root and `e2e/` alongside it avoids the awkwardness of frontend-only or backend-only test locations.

## Risks / Trade-offs

- `@nestjs/schedule` cron jobs should be disabled in the test environment to prevent background jobs interfering with test assertions → Mitigation: set `NODE_ENV=test`, guard cron registration on `NODE_ENV !== 'test'`.
- Transaction rollback approach won't catch bugs in code that commits mid-operation → Acceptable for now; explicit cleanup can be added per-suite if needed.
- Playwright requires browsers to be installed (`npx playwright install`) → Mitigation: document in `Local Development Setup.md`.

## Migration Plan

No migration needed — this is greenfield setup. No existing tests to preserve.
