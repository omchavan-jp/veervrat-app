## ADDED Requirements

### Requirement: VA Dashboard page renders full spec layout
The VA dashboard at `/dashboard` SHALL replace the current stub with the full layout from spec/27 and spec/15. The page is a server component outer shell; interactive sections are `'use client'` components using TanStack Query.

**Layout (top to bottom):**

1. **Header row**: Saka date placeholder (static text "Saka date coming soon"), Gregorian date, greeting `Namaskar, [displayName].`, "Log your experience" button (placeholder, disabled in v1).

2. **Stats bar** (virtue-first primary): Single row of stat chips. Primary: `[N] Virtues · [M] Subvirtues being cultivated`. Secondary chips: `Journeys [active]/[completed]`, `Weaknesses [explored]`, `Tests [taken]`. Derived from `GET /api/v1/dashboard/stats`.

3. **Path cards row** (two columns):
   - **Path card 01 — Study your weakness**: label "Path 01 · Study", title, stat chips (weaknesses explored, tests taken), → `/study` CTA arrow.
   - **Path card 02 — Work on your weakness**: label "Path 02 · Work", title, stat chips (journeys active/completed, ERC active/completed), → `/journeys` CTA arrow.

4. **Sentence suggestions section**: heading "Suggestions for your journey". Maps `GET /api/v1/dashboard/suggestions` response. Each card: sentence text (EN), subvirtue badge, score indicator, weakness name context, "Start journey" button (links to `/study?sentenceId=<id>`). Empty state: "Take your first test to see personalized suggestions." with link to `/study`.

5. **Right sidebar** (rendered in layout slot or via CSS grid):
   - **Shloka of the day**: static placeholder card ("Shloka of the day coming soon").
   - **Platform stats grid**: 2×2 grid of counters from `GET /api/v1/dashboard/platform-stats`. Labels: "Vratarthis", "Vratmitras", "Tests solved", "Practice days". Long `staleTime` (55 min) in TanStack Query — approximately matches Redis TTL.

**Component split:**
- `DashboardPage` (server component): session user passed as prop to children.
- `DashboardStatsBar` (client): `useQuery` for `/dashboard/stats`.
- `DashboardSuggestions` (client): `useQuery` for `/dashboard/suggestions`.
- `DashboardPlatformStats` (client): `useQuery` for `/dashboard/platform-stats`, `staleTime: 55 * 60 * 1000`.

**i18n**: All displayed strings must come from `next-intl` keys under `dashboard.*`. No hardcoded EN/MR text in components.

**Query keys** (to add to `lib/api/query-keys.ts`):
```
dashboard: {
  stats: ['dashboard', 'stats'],
  suggestions: ['dashboard', 'suggestions'],
  platformStats: ['dashboard', 'platform-stats'],
}
```

**API client** (`lib/api/dashboard.ts`): All methods unwrap `Wrapped<T>` with `.then(r => r.data)` per the global pattern.

#### Scenario: Stats bar shows virtue-first primary stat
- **WHEN** the VA has 2 active journeys linked to 2 distinct virtues and 3 distinct subvirtues
- **THEN** the stats bar prominently shows "2 Virtues · 3 Subvirtues being cultivated"

#### Scenario: Suggestions empty state shown when no tests taken
- **WHEN** the VA has no submitted test attempts and the suggestions API returns `{ suggestions: [] }`
- **THEN** the suggestions section displays the empty state text with a link to `/study`

#### Scenario: Platform stats rendered with correct labels
- **WHEN** the platform stats API returns `{ vratarthis: 42, vratmitras: 7, testsSolved: 130, practiceDaysCompleted: 800 }`
- **THEN** all four counters are displayed in the sidebar with their correct labels
