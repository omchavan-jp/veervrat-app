## ADDED Requirements

### Requirement: Seeder imports virtue hierarchy
The seeder SHALL import all virtues, subvirtues, and their parent–child relationships from the CMS SQLite DB into Postgres. Each virtue record SHALL include `nameEn` and `nameMr`. Each subvirtue SHALL reference its parent virtue by UUID (resolved via in-memory map).

#### Scenario: Virtues seeded correctly
- **WHEN** the seeder runs against an empty Postgres DB
- **THEN** all 6 virtues are present in the `virtues` table with correct `name_en` values

#### Scenario: Subvirtues seeded with correct virtue reference
- **WHEN** the seeder runs
- **THEN** all 33 subvirtues are present and each `virtue_id` references a valid virtue UUID

### Requirement: Seeder imports weakness taxonomy
The seeder SHALL import all weaknesses and their subvirtue links (with priority) from the CMS SQLite DB. The `weakness_subvirtues` join table SHALL be populated with correct UUID references.

#### Scenario: Weaknesses seeded
- **WHEN** the seeder runs
- **THEN** 35 weaknesses are present in the `weaknesses` table

#### Scenario: Weakness–subvirtue links seeded
- **WHEN** the seeder runs
- **THEN** 179 rows exist in `weakness_subvirtues` with correct `weakness_id` and `subvirtue_id` UUIDs and correct `priority` values

### Requirement: Seeder imports sentences
The seeder SHALL import all sentences from the CMS SQLite DB including `text_en`, `text_mr`, `source_file`, and `notes`. Each sentence SHALL reference its parent subvirtue by UUID.

#### Scenario: Sentences seeded
- **WHEN** the seeder runs
- **THEN** 226 sentences are present in the `sentences` table

#### Scenario: Sentence ERC metadata preserved
- **WHEN** the seeder runs
- **THEN** 21 sentences have non-null `source_file` values matching the CMS DB

### Requirement: Seeder imports ERC pool
The seeder SHALL import exposures, resolutions, and challenges from the CMS SQLite DB. Tier values SHALL be mapped from lowercase CMS strings (`local`, `national`, `international`) to Prisma enum values (`LOCAL`, `NATIONAL`, `INTERNATIONAL`). Each ERC item SHALL reference its parent sentence by UUID.

#### Scenario: Exposures seeded with correct tier
- **WHEN** the seeder runs
- **THEN** 82 exposures are present and each `tier` value is a valid `ExposureTier` enum

#### Scenario: Resolutions seeded
- **WHEN** the seeder runs
- **THEN** 128 resolutions are present with correct `sentence_id` references

#### Scenario: Challenges seeded
- **WHEN** the seeder runs
- **THEN** 31 challenges are present with correct `sentence_id` references

### Requirement: Seeder imports ERC weakness tags
The seeder SHALL populate `exposure_weaknesses`, `resolution_weaknesses`, and `challenge_weaknesses` join tables. Each join row SHALL reference valid ERC item and weakness UUIDs.

#### Scenario: ERC weakness tags seeded
- **WHEN** the seeder runs
- **THEN** 82 exposure_weakness rows, 128 resolution_weakness rows, and 31 challenge_weakness rows exist

### Requirement: Seeder is idempotent
The seeder SHALL be safe to run multiple times. Re-running against a populated DB SHALL NOT create duplicate rows or throw errors.

#### Scenario: Second run is a no-op
- **WHEN** the seeder is run twice in sequence
- **THEN** row counts are identical after both runs and no errors are thrown

### Requirement: Seeder prints row-count summary
After completing, the seeder SHALL print a summary of the row counts for each seeded table.

#### Scenario: Summary printed on success
- **WHEN** the seeder runs successfully
- **THEN** it prints the count of rows in each of: virtues, subvirtues, weaknesses, weakness_subvirtues, sentences, exposures, exposure_weaknesses, resolutions, resolution_weaknesses, challenges, challenge_weaknesses

### Requirement: Seeder is runnable via npm script
The seeder SHALL be runnable via `pnpm --filter api seed` using a `"seed"` script in `apps/api/package.json`.

#### Scenario: Seed script executes
- **WHEN** `pnpm --filter api seed` is run from the monorepo root
- **THEN** the seeder runs to completion without error
