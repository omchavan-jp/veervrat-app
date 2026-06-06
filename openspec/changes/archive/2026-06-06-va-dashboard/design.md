## Context

The dashboard is a VA's home screen. Currently it's a client stub deriving weakness/test counts from the full weaknesses list call (O(all weaknesses) work on the client, wrong API boundary). The spec requires three distinct backend capabilities: personal stats, sentence suggestions, and platform-wide counts. Platform stats must be Redis-cached per spec/11. All three are read-only aggregations over existing tables — no schema changes.

## Goals / Non-Goals

**Goals:**
- Implement `GET /dashboard/stats` and `GET /dashboard/suggestions` as server-aggregated endpoints
- Implement `GET /dashboard/platform-stats` with 60-minute Redis cache
- Replace the stub dashboard page with the full layout from spec/27 and spec/15
- Virtue-first display: virtues/subvirtues being cultivated is the headline stat

**Non-Goals:**
- Saka date calculation (placeholder text only)
- Shloka-of-the-day content management (static placeholder card)
- Community experiences carousel (placeholder only)
- Pagination or filtering on suggestions (v1 is flat list, capped at 20)
- Real-time push of stat updates (polling is fine)

## Decisions

### Single DashboardModule, no sub-modules
All three endpoints live in one module. The module imports JourneysModule, TestsModule, WeaknessesModule — all already export their services. A DashboardRepository wraps all Prisma aggregation queries; DashboardService owns the suggestion algorithm and caching logic.

Alternative considered: fat queries in the service. Rejected — Prisma must stay in repository files per hard rule.

### Stats endpoint: parallel Prisma queries, not a single mega-join
`/dashboard/stats` runs three parallel queries: journey counts (with ERC sub-counts), test/weakness counts, and virtue/subvirtue derivation from active journey sentences. `Promise.all` keeps latency to ~1 round-trip cost.

Alternative considered: single giant include chain. Rejected — Prisma's N+1 avoidance doesn't compose cleanly across unrelated aggregation dimensions; parallel targeted queries are faster and more readable.

### Virtue derivation: active journeys → sentence → subvirtue → virtue
Only `state IN (ACTIVE, NOT_STARTED)` journeys count. Each journey has one `sentenceId`. We follow `sentence.subvirtueId → subvirtue.virtueId`. Distinct counts: `{ virtueCount: N, subvirtueCount: M }`. This matches spec/15 and spec/21 exactly.

### Suggestion algorithm (v1): latest submitted test per weakness, score ≤ 2, ascending score
For each weakness where the VA has a submitted test: find the most recent submitted `TestAttempt`, take its `TestAnswer` rows with `score <= 2`, include `sentence → subvirtue → virtue` + the weakness name for context. Sort by score ASC (lowest first, most urgent). Cap at 20 items. Dedup by sentenceId (same sentence can appear across weaknesses — keep the one with the lowest score).

Alternative considered: aggregate across all tests, not just latest. Rejected — latest test best reflects current state; old test data for a weakness the VA has improved on would pollute suggestions.

### Platform stats: Redis key `platform:stats`, TTL 3600s
On cache miss: run four Prisma count queries in parallel, serialize to JSON, `SET platform:stats ... EX 3600`. On hit: parse and return. Uses the existing `REDIS_CLIENT` injection token from `RedisModule` (already global).

Alternative considered: scheduled cron refresh. Rejected — lazy cache-aside is simpler, avoids cold-start on first request, and 60-min TTL is fine for approximate stats per spec/11.

### Frontend: server component outer shell + client inner sections
The dashboard page itself is a server component that fetches the session user (already available from layout). The stats bar and suggestions section are `'use client'` components that use TanStack Query for data fetching. Platform stats are also client-fetched with a long `staleTime` (55 min).

### No separate DashboardPage test file — unit tests on service only
The suggestion algorithm is the only non-trivial logic. Auth matrix tests: stats endpoint (positive: VA gets own stats; negative: unauthenticated → 401). Suggestion algorithm unit tests: empty state (no tests taken), single weakness with low-score items, dedup by sentenceId. Frontend RTL: stats bar renders virtues count, suggestions empty state.

## Risks / Trade-offs

- **Suggestion query cost**: For a VA with many weaknesses and tests, the suggestion query scans multiple `TestAttempt` + `TestAnswer` rows. Mitigated by the `@@index([userId, weaknessId])` on `TestAttempt` and the 20-item cap.
- **Redis unavailable**: Platform stats endpoint falls back to a direct DB query if Redis throws. Log the error; don't surface it to the client.
- **v1 suggestion simplicity**: No ML, no weighting by recency of test. Acceptable per spec — v1 is explicitly "lowest score from latest test." Can be upgraded later.
