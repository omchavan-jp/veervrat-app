## Why

The VA dashboard (`/dashboard`) currently shows a stub with hardcoded weakness counts pulled from the weaknesses list endpoint — no real personal stats, no sentence suggestions, no Path card 02, and no platform stats sidebar. This is the first screen VAs land on after onboarding, so it needs to deliver immediate, meaningful signal about their practice.

## What Changes

- New backend `DashboardModule` with two endpoints:
  - `GET /api/v1/dashboard/stats` — personal stats aggregated across journeys, ERC items, tests, and weaknesses. Virtue-first: primary headline is virtues/subvirtues being cultivated from active journey sentences.
  - `GET /api/v1/dashboard/suggestions` — lowest-scored sentences (score ≤ 2) from the latest completed test per weakness (v1 algorithm), with subvirtue/virtue context and a "Start journey" CTA payload.
- Replace the existing stub dashboard page with the full spec layout:
  - Stats bar (virtues/subvirtues primary, then journey/ERC/weakness counts secondary)
  - Path card 01 (Study) and Path card 02 (Work) with real stats
  - Sentence suggestions section (with "Take first test" empty state)
  - Right sidebar: shloka placeholder, platform stats (Vratarthis, Vratmitras, Tests solved, Practice-days) via Redis-cached endpoint

## Capabilities

### New Capabilities

- `dashboard-stats`: `GET /dashboard/stats` — returns personal VA stats (virtues cultivated, journeys active/completed, ERC counts, weaknesses explored, tests taken)
- `dashboard-suggestions`: `GET /dashboard/suggestions` — returns lowest-scored sentences from latest test per weakness (score ≤ 2), with sentence text, subvirtue, virtue, weakness context, score
- `platform-stats`: `GET /dashboard/platform-stats` — returns globally cached platform-wide counts (Vratarthis, Vratmitras, tests solved, practice-days); Redis TTL 60 min
- `dashboard-page`: full VA dashboard UI — stats bar, two path cards, suggestions section, right sidebar

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- New NestJS module: `DashboardModule` (controller + service + repository)
- Imports: `JourneysModule`, `TestsModule`, `WeaknessesModule`, `UsersModule`, `RedisModule` (already global)
- No schema changes — all data derived from existing tables
- Replaces `apps/web/app/(app)/dashboard/page.tsx` (currently a stub)
- New frontend API client: `apps/web/lib/api/dashboard.ts`
- New query keys: `dashboard.stats`, `dashboard.suggestions`, `dashboard.platformStats`
- New i18n strings in `en.json` / `mr.json` under `dashboard.*`
