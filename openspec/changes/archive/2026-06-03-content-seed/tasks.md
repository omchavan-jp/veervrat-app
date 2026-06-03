## 1. Package setup

- [x] 1.1 Add `"seed": "ts-node --transpile-only src/database/seed.ts"` script to `apps/api/package.json`
- [x] 1.2 Create `apps/api/src/database/` directory

## 2. Seeder implementation

- [x] 2.1 Write `apps/api/src/database/seed.ts` — scaffold: PrismaClient init with PrismaPg adapter + dotenv, `parseCsv` helper (RFC 4180 quoted-field CSV), `DATA_DIR` path resolved from repo root
- [x] 2.2 Implement virtue upsert loop — read `virtues.csv`, upsert by `nameEn`, build `virtueMap: Map<name, uuid>`
- [x] 2.3 Implement subvirtue upsert loop — resolve virtue UUID via `virtueMap`, upsert by `nameEn`, build `subvirtueMap`
- [x] 2.4 Implement weakness upsert loop — upsert by `nameEn`, build `weaknessMap`
- [x] 2.5 Implement weakness–subvirtue link seeding — read `weakness_subvirtues.csv`, resolve both UUIDs, `createMany` with `skipDuplicates`
- [x] 2.6 Implement sentence upsert loop — resolve subvirtue UUID, upsert by `textEn`, build `sentenceMap`; then update `source_file`/`notes` from `sentence_erc_meta.csv`
- [x] 2.7 Implement exposure upsert loop — resolve sentence UUID, map tier, upsert by `(sentenceId, titleEn)`, build `exposureMap`
- [x] 2.8 Implement exposure weakness tag seeding — parse pipe-delimited `weakness_names`, resolve UUIDs, `createMany` with `skipDuplicates`
- [x] 2.9 Implement resolution upsert loop — resolve sentence UUID, upsert by `(sentenceId, titleEn)`, build `resolutionMap`
- [x] 2.10 Implement resolution weakness tag seeding
- [x] 2.11 Implement challenge upsert loop — resolve sentence UUID, upsert by `(sentenceId, titleEn)`, build `challengeMap`
- [x] 2.12 Implement challenge weakness tag seeding
- [x] 2.13 Print row-count summary queried from Postgres for all 11 seeded tables

## 3. Verification

- [x] 3.1 Run `pnpm --filter api seed` — confirm expected row counts in output
- [x] 3.2 Run again — confirm no errors and identical counts (idempotency)
- [x] 3.3 Spot-check one virtue, one sentence, one exposure, and one ERC weakness tag in Postgres to verify correct UUID relationships

## 4. Tests

- [x] 4.1 Write unit test `apps/api/src/database/seed.spec.ts` — test `parseCsv` with quoted fields, newlines in values, and pipe-delimited weakness names; test `TIER_MAP` covers all three values
