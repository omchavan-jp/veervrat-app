## Why

After completing onboarding, the framework CTA's "Take a test now" lands on `/study` which 404s. Flow 1 (Study Your Weakness) is the first real user action and the entry point for all journeys — without it nothing downstream (journeys, dashboard stats, sentence suggestions) works. This is the next dependency in the implementation order.

## What Changes

- **Backend**: Two new NestJS modules — `WeaknessesModule` (read-only content) and `TestsModule` (test lifecycle)
- **Backend**: Six new endpoints: weakness list, weakness detail, test create, test answer upsert, test submit, test report
- **Frontend**: Five new route pages under `(app)/study/` — browser, detail, test question (one-at-a-time + view-all), submission preview, report reveal
- **Frontend**: "Why study weaknesses?" info modal accessible from browser, detail, and test entry
- **Frontend**: Dashboard placeholder replaced with real Path card 01 stats (weaknesses explored, tests taken) + sentence suggestions wired to test results
- **Query keys**: extend `query-keys.ts` with `weaknesses` and `tests` namespaces (existing `assessments` keys are unused stubs — replace)

## Capabilities

### New Capabilities
- `weakness-browse`: List all weaknesses grouped by cluster (A/B/C), with per-weakness stats (tests taken, active journey count). Guest-accessible browse; test CTA shows soft auth prompt for guests.
- `weakness-detail`: Detail page with linked subvirtues (each → virtue), test history pills, draft resume button, Take test CTA.
- `test-lifecycle`: Full test draft model — create draft, upsert answers (partial), submit. One draft per user per weakness enforced. Draft-resumable from weakness detail.
- `test-report`: Scored report with virtue-first framing — flagged sentences (score 1-2) surfaced expanded at top with "Virtues to explore" badges; all sentences collapsible below. "Start journey" CTA per sentence.
- `study-nav`: `/study` route wired into app layout nav; framework CTA now resolves correctly.

### Modified Capabilities
- `onboarding-framework`: Framework CTA "Take a test now" now routes to `/study` (was 404). No spec change — implementation gap closed.

## Impact

**Backend — new files:**
- `apps/api/src/modules/weaknesses/` — module, controller, service, repository, DTOs
- `apps/api/src/modules/tests/` — module, controller, service, repository, DTOs
- `apps/api/src/modules/weaknesses/weaknesses.service.spec.ts` — unit tests
- `apps/api/src/modules/tests/tests.service.spec.ts` — unit tests (scoring, flagging, draft enforcement)
- `apps/api/src/app.module.ts` — register both new modules

**Backend — modified:**
- `apps/api/src/common/permissions/types.ts` — `test.take` and `test.view_results` already declared; no change needed
- `apps/api/src/common/permissions/has-permission.ts` — add `test.take` and `test.view_results` case handlers

**Frontend — new files:**
- `apps/web/app/(app)/study/page.tsx` — WeaknessBrowser
- `apps/web/app/(app)/study/[id]/page.tsx` — WeaknessDetail
- `apps/web/app/(app)/study/[id]/test/page.tsx` — redirect: creates/resumes draft, pushes to `[testId]`
- `apps/web/app/(app)/study/[id]/test/[testId]/page.tsx` — TestQuestion (one-at-a-time + view-all modes)
- `apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx` — TestSubmissionPreview
- `apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx` — TestReport reveal
- `apps/web/lib/api/weaknesses.ts` — typed API functions
- `apps/web/lib/api/tests.ts` — typed API functions
- `apps/web/hooks/use-weaknesses.ts` — TanStack Query hooks
- `apps/web/hooks/use-tests.ts` — TanStack Query hooks + mutations
- `apps/web/components/study/why-modal.tsx` — "Why study weaknesses?" modal

**Frontend — modified:**
- `apps/web/app/(app)/dashboard/page.tsx` — add Path card 01 stats + sentence suggestions
- `apps/web/lib/api/query-keys.ts` — add weaknesses + tests namespaces
- `apps/web/messages/en.json` + `mr.json` — study flow i18n keys
- `apps/web/components/layout/header.tsx` — add Study nav link

**No new dependencies** — framer-motion (already installed) used for report reveal animation.
**No DB migrations** — TestAttempt + TestAnswer tables already exist in schema.
