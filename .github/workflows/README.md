# CI Workflows

Two workflows run on push to `dev`/`main` and on all PRs targeting them. They activate
automatically once the repo is pushed to GitHub (see `PUSH_INSTRUCTIONS.md`).

## `ci.yml` — fast gate (no services)
Runs on Node 24 + pnpm 11.1.3:
1. `pnpm --filter api db:generate` — Prisma client (a generated import the api needs)
2. `pnpm lint` — eslint across api/web/types (0 errors required; warnings allowed)
3. `pnpm typecheck` — `tsc --noEmit` across the workspace
4. `pnpm --filter api test:unit` + `pnpm --filter web test` — unit tests (no DB)
5. `pnpm build` — turbo build of all packages

## `integration.yml` — integration gate (Postgres + Redis)
Same setup plus Postgres 16 + Redis 7 service containers. Applies migrations
(`db:migrate:deploy`) to the test DB, then runs `pnpm --filter api test:integration`.
Job-level `DATABASE_URL`/`REDIS_URL` override `.env.test`'s local ports to reach the
service containers.

## Notes / deliberate scoping
- **Lint is `--fix`-free in CI** (`api` has a separate `lint:fix` for local dev) — CI
  must check, not mutate.
- **`prettier/prettier` is enforced via eslint** on api code. Repo-wide
  `format:check` is NOT a CI gate (≈471 unformatted markdown/spec docs — a separate
  cosmetic cleanup, out of scope for the code gate).
- **Playwright E2E runs in CI** (`e2e.yml`, wired 2026-08-27). It had existed and run nowhere;
  the stated reason was the docker stack, but the real one was that registration is throttled to
  5/hour and the suite needs ~15 accounts. "Unit + integration + build cover the code paths" was
  the belief that let a string of defects reach a person instead of a test — see
  `ops/audit/01-e2e-runtime-pass.md`.
- Everything here was verified green locally before the workflows were written.
