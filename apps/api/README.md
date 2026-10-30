# Veervrat API

## Overview

NestJS backend for the Veervrat application, with domain modules composed by AppModule and PostgreSQL persistence defined in Prisma. Package tooling configures Prisma CLI, ESLint and separate Vitest projects [src/app.module.ts:AppModule] [prisma/schema.prisma:db] [prisma.config.ts:defineConfig] [eslint.config.mjs:tseslint.config] [vitest.config.ts:defineConfig].

## Interface

- Prisma CLI default config selects prisma/schema.prisma, DATABASE_URL and optional SHADOW_DATABASE_URL [prisma.config.ts:defineConfig].
- ESLint default export combines recommended JavaScript, type-checked TypeScript and Prettier configs with Node/Jest globals and projectService [eslint.config.mjs:tseslint.config].
- Vitest default export defines unit and integration projects with tsconfigPaths, node environment and globals [vitest.config.ts:defineConfig].
- Package scripts expose Nest build/start/watch, tsc typecheck, Prisma generate/migrate deploy, ESLint, Vitest and database seed commands [package.json:scripts].
- [prisma](./prisma/README.md): PostgreSQL Prisma schema defines identity, content, assessments, journeys, mentoring, community, notifications, feedback and audit persistence with prisma-client-js generation.
- [scripts](./scripts/README.md): Integration database migration launcher.
- [src](./src/README.md): Composes and starts the Nest application, configures HTTP behavior, and exposes dependency probes.

## Invariants

- Unit project includes src/\*_/_.spec.ts but excludes integration specs and src/test; integration includes integration specs and src/test/smoke.spec.ts, loading src/test/setup.ts [vitest.config.ts:projects].
- Integration runs forks with maxWorkers=1, fileParallelism=false and hookTimeout=30000 [vitest.config.ts:projects].
- Lint disables no-explicit-any, warns on floating promises and unsafe arguments, errors on unused vars except underscore-prefixed names; test-file unsafe operations are warnings [eslint.config.mjs:rules].

## Side Effects

- Importing Prisma CLI configuration loads dotenv/config into process environment [prisma.config.ts:import].

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
