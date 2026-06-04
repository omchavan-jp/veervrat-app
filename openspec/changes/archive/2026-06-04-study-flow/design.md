## Context

The study flow is item 10 in the implementation order — the first feature users interact with after onboarding. The schema already has `test_attempts` and `test_answers` tables. The `WeaknessesModule` and `TestsModule` do not exist. The permission system (`hasPermission`) already has `test.take` and `test.view_results` action strings declared in `types.ts` but their cases are not implemented in `has-permission.ts`. The frontend has no study routes at all.

Two key architectural challenges: the draft model (one draft per user per weakness, resumable) and the report computation (join across TestAnswer → Sentence → Subvirtue → Virtue, with flagging logic applied server-side).

## Goals / Non-Goals

**Goals:**
- Weakness list grouped by cluster (A/B/C from `weakness.category`), with stats
- Weakness detail with subvirtue→virtue chain and test history
- Full test draft model: create, upsert answers, submit — idempotent draft creation
- Server-side report computation: score, flag, sort, virtue chain — report is a read endpoint, not stored separately
- Virtue-first report framing per spec/decisions/21
- Frontend: all 5 study screens per spec/decisions/27 screen specs
- Auth matrix tests: `test.take` positive (VA) + negative (no session)
- Unit tests: scoring logic, draft enforcement, flagging

**Non-Goals:**
- Guest auth prompt modal (soft gate for non-authenticated test CTA) — render a disabled/redirect state for now; full soft-prompt modal is item 9's walkthrough feature
- Journey start from report (renders the button, navigation to `/journeys/new?sentence=id` — actual journey creation is item 11)
- Sentence info modal full implementation (info icon on test question renders a tooltip for now)
- VM test result viewing (permission exists, enforced at service layer, but no VM-facing UI in this item)
- Dashboard right sidebar (shloka of the day, platform stats) — left as placeholder
- Weakness pins / manual prioritisation

## Decisions

### Decision 1: Report is computed on-demand, not stored

**Chosen:** `GET /api/v1/tests/:id/report` runs the scoring computation at read time. No `TestReport` table.

**Rationale:** Test answers are already stored. The report is a pure function of those answers plus the weakness→subvirtue→sentence→virtue join. Storing it would require re-computing and re-storing on any seed data change. The computation is O(n) where n = sentence count per weakness (typically 20-50) — negligible.

**Alternative:** Materialise report at submit time. Rejected — adds a table, a write path, and invalidation complexity for no real benefit at this scale.

### Decision 2: Draft enforcement at service layer — return existing draft on conflict

**Chosen:** `POST /api/v1/tests` checks for an existing draft for `(userId, weaknessId)`. If found, returns the existing draft (200 with `{ existed: true }`). If not, creates a new one (201).

**Why not 409 conflict?** The frontend always calls POST when the user clicks "Take test" — it should not need to first check for a draft. Returning the existing draft is idempotent from the caller's perspective and avoids a round-trip.

### Decision 3: Answer upsert is a full batch replace per PATCH call

**Chosen:** `PATCH /api/v1/tests/:id/answers` accepts `{ answers: [{ sentenceId, score }] }` and upserts each answer (createOrUpdate on the unique `(testAttemptId, sentenceId)` constraint). Client can send partial batches (just changed answers).

**Alternative:** PUT replacing all answers at once. Rejected — for large tests mid-session, sending all answers on every keystroke is wasteful. Partial upsert is correct for the draft model.

### Decision 4: Stats on weakness list are computed via DB aggregation, not denormalised

**Chosen:** The weakness list query joins to `test_attempts` (count submitted, per-user latest) and `journey_weaknesses` (count active journeys) using Prisma's `_count` and `where` filters. No denormalised stats columns on `weaknesses`.

**Trade-off:** Adds query complexity. Acceptable — weakness list is not high-frequency and the count queries are indexed (userId+weaknessId on test_attempts, weaknessId on journey_weaknesses).

### Decision 5: Frontend test state lives in URL, not global state

**Chosen:** The current answer state is managed in the `TestQuestion` page component with `useState`. On every answer change, a debounced PATCH is fired to save to backend. The test ID is in the URL (`/study/[id]/test/[testId]`). Navigating back/forward is safe — answers are server-persisted.

**Why not Zustand/context?** CLAUDE.md hard rule: no global state libraries. URL + server state (TanStack Query) is sufficient.

### Decision 6: View-all mode is a client-side toggle, not a separate route

**Chosen:** `viewMode: 'one-at-a-time' | 'view-all'` is local state in the TestQuestion page. Switching modes does not change the URL.

### Decision 7: "Start journey" on report links to `/journeys/new?sentenceId=X`

**Chosen:** The button renders and links to this URL even though the journey creation route doesn't exist yet (item 11). The user sees a 404 if they click it — acceptable for this item. The link is correct and will work once item 11 is built.

## Risks / Trade-offs

- **[Risk] Cluster grouping relies on `category` field being populated** → Mitigation: seed data already sets A/B/C categories (confirmed in seed.ts). If null, group under "Other".
- **[Risk] Report computation for large weakness sentence sets** → Mitigation: sentence counts per weakness are bounded (20-50 per seed data). No pagination needed.
- **[Risk] Debounced answer save could lose last answer if user submits quickly** → Mitigation: submission preview always re-reads server state via GET before confirming. The debounce flush runs on navigate-away.
- **[Risk] TestAnswer `score` column accepts any int** → Mitigation: DTO validates `@IsIn([1, 2, 3, 4])`.

## Migration Plan

No DB migrations needed — `test_attempts` and `test_answers` tables exist. Deploy order:
1. Backend (`WeaknessesModule` + `TestsModule` registered in `AppModule`)
2. Frontend (study routes + dashboard Path card 01 update)

Rollback: revert `AppModule` registration — no data written to new tables by existing code.
