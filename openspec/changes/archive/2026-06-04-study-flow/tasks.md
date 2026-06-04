## 1. Backend — WeaknessesModule

- [x] 1.1 Create `apps/api/src/modules/weaknesses/weaknesses.repository.ts` — `findAll(userId?: string)` (with cluster grouping and per-user stats via `_count` on test_attempts+journey_weaknesses), `findById(id, userId?)` (with subvirtues→virtue, test history, draftTestId)
- [x] 1.2 Create `apps/api/src/modules/weaknesses/weaknesses.service.ts` — `listWeaknesses(user?)` returns grouped clusters; `getWeakness(id, user?)` returns detail; no permission check needed (guest-accessible)
- [x] 1.3 Create `apps/api/src/modules/weaknesses/weaknesses.controller.ts` — `GET /weaknesses` (optional session via `@OptionalSession()` or try/catch on session), `GET /weaknesses/:id`
- [x] 1.4 Create `apps/api/src/modules/weaknesses/weaknesses.module.ts` — exports `WeaknessesService`
- [x] 1.5 Register `WeaknessesModule` in `apps/api/src/app.module.ts`

## 2. Backend — TestsModule

- [x] 2.1 Create `apps/api/src/modules/tests/tests.repository.ts` — `findDraftByUserAndWeakness(userId, weaknessId)`, `createDraft(userId, weaknessId)`, `findById(id)` (with answers + sentences), `upsertAnswers(testId, answers[])`, `markSubmitted(testId)`, `findReportData(testId)` (full join: answers→sentence→subvirtue→virtue)
- [x] 2.2 Create `apps/api/src/modules/tests/tests.service.ts`:
  - `createOrResumeDraft(userId, weaknessId)` — idempotent; returns `{ test, existed }`
  - `saveAnswers(userId, testId, answers)` — validates ownership + draft status; calls upsertAnswers
  - `submitTest(userId, testId)` — validates ownership + draft; sets isDraft=false, submittedAt=now
  - `getReport(userId, testId)` — validates ownership (or VM scoping); computes flaggedSentences (score ≤2, sorted asc), otherSentences, virtuesToExplore (deduped from flagged)
- [x] 2.3 Create `apps/api/src/modules/tests/dto/create-test.dto.ts` — `weaknessId: string` (IsUUID)
- [x] 2.4 Create `apps/api/src/modules/tests/dto/save-answers.dto.ts` — `answers: [{ sentenceId: string (IsUUID), score: number (IsIn([1,2,3,4])) }]`
- [x] 2.5 Create `apps/api/src/modules/tests/tests.controller.ts` — `POST /tests` (SessionGuard, `test.take`), `PATCH /tests/:id/answers` (SessionGuard), `POST /tests/:id/submit` (SessionGuard), `GET /tests/:id/report` (SessionGuard)
- [x] 2.6 Create `apps/api/src/modules/tests/tests.module.ts`
- [x] 2.7 Register `TestsModule` in `apps/api/src/app.module.ts`
- [x] 2.8 Add `test.take` and `test.view_results` case handlers to `apps/api/src/common/permissions/has-permission.ts`
- [x] 2.9 Add `TEST_ALREADY_SUBMITTED` and `TEST_NOT_SUBMITTED` exception variants to `apps/api/src/common/exceptions/app.exceptions.ts`

## 3. Backend — Tests

- [x] 3.1 Create `apps/api/src/modules/tests/tests.service.spec.ts`:
  - UNIT: `createOrResumeDraft` — creates new draft when none exists; returns existing draft with `existed:true` when one exists
  - UNIT: `saveAnswers` — throws on submitted test (TEST_ALREADY_SUBMITTED); throws on wrong owner (403); upserts correctly
  - UNIT: `submitTest` — throws on already-submitted; sets isDraft=false
  - UNIT: `getReport` — correctly flags score≤2; sorts Never (1) before Sometimes (2); deduplicates virtues; throws on draft test (TEST_NOT_SUBMITTED)
  - AUTH MATRIX POSITIVE: `test.take` — VA can call `POST /tests`
  - AUTH MATRIX NEGATIVE: `test.take` — no session returns 401
- [x] 3.2 Create `apps/api/src/modules/weaknesses/weaknesses.service.spec.ts`:
  - UNIT: `listWeaknesses` — groups by cluster A/B/C; handles null category → "Other"
  - UNIT: `getWeakness` — returns 404 for unknown ID

## 4. Frontend — API layer

- [x] 4.1 Add `weaknesses` and `tests` namespaces to `apps/web/lib/api/query-keys.ts`:
  ```
  weaknesses: { all, detail: (id) }
  tests: { draft: (weaknessId), detail: (id), report: (id) }
  ```
  Remove unused `assessments` stubs
- [x] 4.2 Create `apps/web/lib/api/weaknesses.ts` — typed functions: `listWeaknesses()`, `getWeakness(id)`; response types: `WeaknessListResponse`, `WeaknessDetailResponse`
- [x] 4.3 Create `apps/web/lib/api/tests.ts` — typed functions: `createOrResumeTest(weaknessId)`, `saveAnswers(testId, answers)`, `submitTest(testId)`, `getTestReport(testId)` ; response types: `TestDraft`, `TestReport`, `ReportSentence`
- [x] 4.4 Create `apps/web/hooks/use-weaknesses.ts` — `useWeaknesses()`, `useWeakness(id)` (TanStack Query)
- [x] 4.5 Create `apps/web/hooks/use-tests.ts` — `useCreateTest()` (mutation), `useSaveAnswers()` (mutation), `useSubmitTest()` (mutation), `useTestReport(testId)` (query)

## 5. Frontend — Study pages

- [x] 5.1 Create `apps/web/app/(app)/study/page.tsx` — WeaknessBrowser: server component fetches weakness list; renders cluster sections A/B/C; each card links to `/study/[id]`; "Why study weaknesses?" info modal trigger
- [x] 5.2 Create `apps/web/components/study/why-modal.tsx` — modal with virtue-first philosophy text; dismissible; accessible from browser, detail, test entry
- [x] 5.3 Create `apps/web/app/(app)/study/[id]/page.tsx` — WeaknessDetail: fetch weakness detail; render subvirtues list with virtue labels; test history pills; "Resume draft" or "Take test" CTA; why-modal trigger
- [x] 5.4 Create `apps/web/app/(app)/study/[id]/test/page.tsx` — redirect page: client component, calls `useCreateTest(weaknessId)` on mount, on success `router.replace(/study/[id]/test/[testId])`. Renders spinner while pending.
- [x] 5.5 Create `apps/web/app/(app)/study/[id]/test/[testId]/page.tsx` — TestQuestion:
  - Client component with local state: `answers: Map<sentenceId, score>`, `currentIndex`, `viewMode`
  - Fetches weakness sentences (via weakness detail query — sentences come from subvirtues)
  - Debounced `useSaveAnswers` fires on each answer change (400ms debounce)
  - One-at-a-time mode: renders single sentence + 4 answer buttons (Always/Often/Sometimes/Never in EN+MR), prev/next nav
  - View-all mode: scrollable list with inline answer buttons
  - Top bar: weakness name, progress bar (X/total answered), view mode toggle, "Save draft & exit" button
  - Submit sticky footer: enabled when ≥1 answer; unanswered-warning popup if gaps exist
  - On submit → navigate to `/study/[id]/test/[testId]/preview`
- [x] 5.6 Create `apps/web/app/(app)/study/[id]/test/[testId]/preview/page.tsx` — TestSubmissionPreview:
  - Lists all sentences with answers (color-coded) or "—" for unanswered
  - [Confirm submission] calls `useSubmitTest()`, on success → navigate to `/study/[id]/test/[testId]/report`
  - [Go back to review] → navigate back
- [x] 5.7 Create `apps/web/app/(app)/study/[id]/test/[testId]/report/page.tsx` — TestReport:
  - Fetches `useTestReport(testId)`
  - "Virtues to explore" badge row (from flagged sentences)
  - Flagged sentences section (expanded by default): animated in with Framer Motion; sorted Never→Sometimes
  - "See all sentences" collapsible section: animate open on click
  - Each sentence: text EN+MR, score tag, subvirtue badge, "Start journey" button (links to `/journeys/new?sentenceId=X`)
  - Progressive build animation: stagger in sections using framer-motion `variants`

## 6. Frontend — Nav + Dashboard

- [x] 6.1 Add "Study" link to `apps/web/components/layout/header.tsx` pointing to `/study`
- [x] 6.2 Update `apps/web/app/(app)/dashboard/page.tsx` — replace placeholder with:
  - Path card 01: title "Study your weakness", stats (weaknesses explored, tests taken), CTA arrow → `/study`, why-modal link
  - Sentence suggestions section: lowest-scored sentences from `GET /api/v1/weaknesses` stats (or a dedicated suggestions query added to tests API); "Start journey" per sentence; empty state if no tests yet

## 7. Frontend — i18n

- [x] 7.1 Add `study` namespace to `apps/web/messages/en.json`: keys for browser (title, cluster labels, whyModal text), detail (testHistory, resumeDraft, takeTest, subvirtues section), test screen (answer labels: always/often/sometimes/never, saveDraft, exitConfirm, submitWarning, progress), preview (confirmSubmit, goBack, unanswered), report (flaggedTitle, otherTitle, virtuesTitle, startJourney, noFlagged, backToWeakness)
- [x] 7.2 Add matching `study` namespace to `apps/web/messages/mr.json`

## 8. Frontend — Tests

- [x] 8.1 Create `apps/web/src/test/weakness-browser.test.tsx`:
  - Renders cluster sections A/B/C
  - Each weakness card links to `/study/[id]`
  - Uses `vi.hoisted()` for API mock; `fireEvent` (not `userEvent`) for interactions
- [x] 8.2 Create `apps/web/src/test/test-question.test.tsx`:
  - Answer selection updates local state; debounced save fires (act+Promise.resolve() pattern for debounce flush)
  - Submit disabled when zero answers; enabled after one answer
  - View-all toggle renders all sentences
- [x] 8.3 Run `pnpm test` in both `apps/api` and `apps/web` — all tests must pass before apply is marked done
