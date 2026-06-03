## Why

The Prisma schema defines the full content hierarchy (virtues → subvirtues → weaknesses → sentences → ERC pool), but the Postgres database is empty. Without seeded content, no test can run against real data, the dashboard suggestion algorithm has nothing to return, and study-flow development cannot proceed. The CMS SQLite database already contains 6 virtues, 33 subvirtues, 35 weaknesses, 179 weakness–subvirtue links, 226 sentences, 82 exposures, 128 resolutions, and 31 challenges — all with weakness tags and sentence ERC metadata. A TypeScript seeder is needed to transfer this data into Postgres via Prisma.

## What Changes

- New file `apps/api/src/database/seed.ts` — idempotent seeder that reads from the CMS SQLite DB and writes to Postgres via Prisma
- New npm script `"seed"` in `apps/api/package.json` (`tsx src/database/seed.ts`)
- No schema changes — all target tables already exist in `schema.prisma`
- No API routes, no frontend changes

## Capabilities

### New Capabilities
- `content-seed`: Idempotent TypeScript seeder that imports virtue/subvirtue/weakness/sentence/ERC data from the CMS SQLite DB into the Postgres database via Prisma

### Modified Capabilities
<!-- none -->

## Impact

- **New file**: `apps/api/src/database/seed.ts`
- **Modified**: `apps/api/package.json` (adds `seed` script)
- **No new dependencies** — reads CSV files via Node built-in `fs` + `readline`
- **Populated tables**: `virtues`, `subvirtues`, `weaknesses`, `weakness_subvirtues`, `sentences`, `exposures`, `exposure_weaknesses`, `resolutions`, `resolution_weaknesses`, `challenges`, `challenge_weaknesses`
- **Source**: `data/seed/*.csv` — 9 CSV files checked into the repo
