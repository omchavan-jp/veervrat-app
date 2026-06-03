## Context

9 CSV files in `data/seed/` are the canonical content source:

- `virtues.csv`, `subvirtues.csv`, `weakness.csv`, `weakness_subvirtues.csv`, `sentences.csv` — taxonomy
- `sentence_erc_meta.csv` — adds `source_file` / `notes` to matching sentences
- `exposures.csv`, `resolutions.csv`, `challenges.csv` — ERC pool items with weakness tags

Counts: 6 virtues, 33 subvirtues, 35 weaknesses, 179 weakness–subvirtue links, 226 sentences (21 with ERC metadata), 82 exposures, 128 resolutions, 31 challenges.

The Prisma schema already models all these entities. The seeder reads CSVs → writes to Postgres via Prisma.

Key mapping concerns:
- CSVs reference related entities by name (e.g. `virtue_name_en`, `subvirtue_name_en`, `sentence_text_en`); Prisma uses UUIDs — the seeder must build in-memory `Map<name, uuid>` per entity type
- Exposure `tier` values are lowercase in CSV (`local`, `national`, `international`); Prisma's `ExposureTier` enum is uppercase — needs a mapping step
- ERC weakness tags use pipe-delimited `weakness_names` column (e.g. `Defeated mindset|Procrastination`)
- `frequency_per_week` and `frequency_label` are not in the CSV (added later in Prisma schema) — seeded as `null`

## Goals / Non-Goals

**Goals:**
- Single TypeScript file at `apps/api/src/database/seed.ts`, runnable via `pnpm --filter api seed`
- Idempotent: safe to run multiple times
- Zero new dependencies — reads CSV via Node built-in `fs` + `readline`
- Prints a row-count summary on completion

**Non-Goals:**
- Does not seed users, sessions, or any auth data
- Does not run migrations — assumes schema is already applied
- No API endpoint or NestJS module — CLI script only

## Decisions

### D1: CSV via `fs` + `readline` (no new deps)
Node has built-in readline for line-by-line reading. A small `parseCsv(path)` helper returns `Record<string, string>[]`. No native addons, no new entries in `Platform-Engineering-Standard.md`.

CSV parsing caveat: fields can contain commas inside double-quotes (e.g. long descriptions). The helper must handle RFC 4180 quoting. A simple state-machine parser covers this — no edge cases beyond standard quoted-field CSV.

### D2: In-memory name→UUID maps
The seeder resolves cross-references via name. After upserting each entity, it stores `nameOrText → uuid` in a `Map<string, string>`. Join rows are resolved from these maps.

Alternative considered: lookup by name via extra Prisma queries at join time. Rejected — O(n) extra round-trips for a dataset of this size is avoidable.

### D3: Individual `upsert` calls (not `createMany`)
`createMany` with `skipDuplicates` doesn't return IDs — can't build the name→UUID map. Individual `upsert` calls return the record including its UUID. Throughput isn't a concern for a one-off seeding script.

### D4: Tier string mapping
```ts
const TIER_MAP: Record<string, ExposureTier> = {
  local: 'LOCAL', national: 'NATIONAL', international: 'INTERNATIONAL',
};
```

### D5: PrismaClient instantiated directly in the script
The seeder is not a NestJS module — it instantiates `PrismaClient` with `PrismaPg` adapter directly (same pattern as `PrismaService` constructor), reads `DATABASE_URL` from env (loaded via `dotenv` which is already a project dependency).

### D6: Run via `ts-node` (already available)
`ts-node` is already in `apps/api`'s devDependencies. Script: `"seed": "ts-node --transpile-only src/database/seed.ts"` in `apps/api/package.json`. `--transpile-only` skips type-checking for fast execution.

## Risks / Trade-offs

- **Manual CSV parser edge cases** → Mitigation: Use a well-tested state-machine approach. The CSV files are machine-generated and well-formed — no pathological edge cases expected.
- **Seeder is not fully transactional** → If it fails halfway, re-run picks up where it left off (upserts are idempotent for top-level entities; join rows use `createMany` with `skipDuplicates`). Acceptable for a dev tool.
- **CSV path is relative to repo root** → Seeder resolves `data/seed/` relative to `process.cwd()`. Must be run from the repo root or via `pnpm --filter api seed` (which sets cwd to the workspace root).
