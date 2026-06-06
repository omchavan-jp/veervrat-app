## Tasks

### Backend

- [x] Create `apps/api/src/modules/dashboard/` directory with module, controller, service, repository files
- [x] Implement `DashboardRepository` with three methods: `getStats(userId)`, `getSuggestions(userId)`, `getPlatformStats()`
  - `getStats`: three parallel Prisma queries — journey/ERC counts, test/weakness counts, virtue/subvirtue derivation from active journey sentences. Return unified stats shape.
  - `getSuggestions`: for each weakness with a submitted attempt, get the latest attempt's low-score answers (score ≤ 2), include sentence→subvirtue→virtue, deduplicate by sentenceId (keep lowest score), sort ASC, cap at 20.
  - `getPlatformStats`: four parallel Prisma count queries — vratarthis count, distinct VMs, submitted test attempts, practice days approximation.
- [x] Implement `DashboardService` with methods `getStats`, `getSuggestions`, `getPlatformStats`
  - `getPlatformStats`: Redis cache-aside using `REDIS_CLIENT` injection token; key `platform:stats`, TTL 3600s; fallback to DB on Redis error (log but do not rethrow).
- [x] Implement `DashboardController` with three GET routes:
  - `GET /dashboard/stats` — `@UseGuards(SessionGuard)`, only role `VRATARTHI` (403 if VM-only)
  - `GET /dashboard/suggestions` — `@UseGuards(SessionGuard)`, only role `VRATARTHI`
  - `GET /dashboard/platform-stats` — `@UseGuards(SessionGuard)`, any authenticated user
- [x] Create `DashboardModule` importing `RedisModule` (already global, no explicit import needed), register in `AppModule`
- [x] Write unit tests in `dashboard.service.spec.ts`:
  - `getStats`: VA with active journeys → correct virtue/subvirtue counts
  - `getStats`: VA with no data → all zeros
  - `getSuggestions`: two weaknesses, sorted score ASC, deduplicated sentenceId
  - `getSuggestions`: empty state (no tests)
  - `getSuggestions`: cap at 20
  - `getPlatformStats`: cache hit returns cached value (no DB calls)
  - `getPlatformStats`: cache miss → DB query → writes to Redis
  - `getPlatformStats`: Redis error → falls back to DB
- [x] Write auth matrix tests in `dashboard.controller.spec.ts` (or integration test):
  - Positive: authenticated VA gets 200 for all three endpoints
  - Negative: unauthenticated → 401 for all three endpoints
  - Negative: VM-only role → 403 for `/dashboard/stats` and `/dashboard/suggestions`

### Frontend

- [x] Create `apps/web/lib/api/dashboard.ts` with typed API functions for `stats`, `suggestions`, `platformStats` — all unwrap `Wrapped<T>` with `.then(r => r.data)`
- [x] Add `dashboard` query keys to `apps/web/lib/api/query-keys.ts`: `stats`, `suggestions`, `platformStats`
- [x] Add `dashboard.*` i18n strings to `apps/web/messages/en.json` and `mr.json`:
  - `pathCard01Title`, `pathCard01Subtitle`, `pathCard02Title`, `pathCard02Subtitle`
  - `statsVirtues`, `statsSubvirtues`, `statsJourneys`, `statsWeaknesses`, `statsTests`
  - `suggestionsTitle`, `suggestionsEmpty`, `suggestionsStartJourney`
  - `platformStatsVratarthis`, `platformStatsVratmitras`, `platformStatsTestsSolved`, `platformStatsPracticeDays`
  - `greeting`, `sakaPlaceholder`, `logExperience`
- [x] Create `apps/web/components/dashboard/dashboard-stats-bar.tsx` (`'use client'`):
  - `useQuery` for `/dashboard/stats`
  - Renders virtue-first primary stat + secondary chips
- [x] Create `apps/web/components/dashboard/dashboard-suggestions.tsx` (`'use client'`):
  - `useQuery` for `/dashboard/suggestions`
  - Maps suggestion cards with subvirtue badge, score, "Start journey" link to `/study?sentenceId=<id>`
  - Empty state when `suggestions.length === 0`
- [x] Create `apps/web/components/dashboard/dashboard-platform-stats.tsx` (`'use client'`):
  - `useQuery` for `/dashboard/platform-stats` with `staleTime: 55 * 60 * 1000`
  - 2×2 grid of stat counters with labels
- [x] Replace `apps/web/app/(app)/dashboard/page.tsx` with server component using new components:
  - Header row (Saka placeholder, date, greeting, log experience button)
  - `<DashboardStatsBar />`
  - Two-column path cards + right sidebar (3-column CSS grid)
  - `<DashboardSuggestions />`
  - Sidebar: shloka placeholder + `<DashboardPlatformStats />`
- [x] Write frontend unit tests in `apps/web/src/test/dashboard-stats-bar.test.tsx`:
  - Stats bar renders virtue/subvirtue count from mocked API
  - Loading state renders skeleton (or at minimum doesn't crash)
- [x] Write frontend unit tests in `apps/web/src/test/dashboard-suggestions.test.tsx`:
  - Empty state shown when `suggestions: []`
  - Suggestion card renders sentence text and "Start journey" link
