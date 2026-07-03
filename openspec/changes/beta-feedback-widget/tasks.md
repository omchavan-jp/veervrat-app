# Tasks — Beta Feedback Widget

## 1. Database & permissions

- [ ] 1.1 Prisma schema: `FeedbackItem` (uuid id, reporterId FK→User, reporterRole, type enum `FeedbackType {ISSUE, IMPROVEMENT}`, status enum `FeedbackStatus {NEW, TRIAGED, DONE, DECLINED}`, title, description?, route?, locale?, viewport?, userAgent?, commitSha?, declineReason?, createdAt/updatedAt, index on [status, createdAt]) + `FeedbackUpvote` (uuid id, feedbackItemId FK cascade, userId FK cascade, createdAt, `@@unique([feedbackItemId, userId])`); migration `add_feedback_tables` (own commit, `db:` prefix)
- [ ] 1.2 Add `feedback` resource rows to `spec/decisions/05_permissions.md` (create/read/upvote: all authenticated roles; manage: admin) and register the resource in the `hasPermission()` implementation

## 2. API module (`apps/api/src/modules/feedback/`)

- [ ] 2.1 `feedback.repository.ts` — create, cursor list (status filter, newest first, upvote `_count` + requester's upvote), upvote toggle (create/delete on unique pair), status update; Prisma only here
- [ ] 2.2 DTOs — `create-feedback.dto.ts` (type, title 1–120, description ≤2000, route ≤300, locale ≤10, viewport ≤20, commitSha ≤64), `update-feedback.dto.ts` (status enum subset, declineReason ≤500), `list-feedback.query.dto.ts` (cursor, limit, includeResolved)
- [ ] 2.3 `feedback.service.ts` — stamps reporter identity/role from session, ignores body identity fields, truncates userAgent (300), enforces DECLINED⇒declineReason, `hasPermission` check for manage; custom exceptions from `common/exceptions/`
- [ ] 2.4 `feedback.controller.ts` — POST `/feedback` (`@Throttle` 10/h), GET `/feedback`, POST `/feedback/:id/upvote` (`@Throttle` 60/h), PATCH `/feedback/:id` (`@Audited()` with old→new status); wire `feedback.module.ts` into `app.module.ts`
- [ ] 2.5 Unit tests alongside: service tests (identity stamping, decline-reason rule, permission denial) + auth matrix (positive + negative per permission row: create/read/upvote as vratarthi, manage as admin, manage as non-admin ⇒ 403, unauthenticated ⇒ 401)

## 3. Web — API client & metadata plumbing

- [ ] 3.1 `lib/api/feedback.ts` + query keys — typed functions (createFeedback, listFeedback, toggleUpvote) through `lib/api/client.ts`; shared types in `@veervrat/types` if the existing pattern does so for other modules (match convention)
- [ ] 3.2 Commit SHA + mode plumbing: `apps/web/Dockerfile` ARG/ENV `NEXT_PUBLIC_COMMIT_SHA` and `NEXT_PUBLIC_FEEDBACK_MODE`; document Railway values (`${{RAILWAY_GIT_COMMIT_SHA}}`, `test`)

## 4. Web — widget UI (`components/shared/feedback/`)

- [ ] 4.1 `FeedbackButton` — framer-motion `motion.button` with drag; on dragEnd snap to nearest corner (spring), persist corner id in localStorage (default `br`), safe-area insets, distinguish click vs drag; hidden when mode unset
- [ ] 4.2 `FeedbackModal` — shadcn Dialog with tabs: Observations (list w/ tag chip, status chip, +1 toggle with optimistic update, `includeResolved` toggle-free default) and Raise new (RHF+Zod: type, title, description); auto-context capture (pathname, locale, viewport, `NEXT_PUBLIC_COMMIT_SHA`); success confirmation + list invalidation; `public` mode renders form only
- [ ] 4.3 Mount `<FeedbackWidget />` in the four authenticated route-group layouts; verify absent on (public) pages
- [ ] 4.4 i18n: add all widget strings to `messages/en.json` + `messages/mr.json`; no hardcoded text

## 5. Verify, deploy, close the loop

- [ ] 5.1 `pnpm test` (api + web) green; lint + typecheck green
- [ ] 5.2 Local end-to-end: raise item as one user, +1 as another, PATCH status as admin, confirm list ordering/filtering and corner-snap persistence across reload
- [ ] 5.3 Apply migration to prod manually (docker build-stage image, direct Neon host) per hard rule
- [ ] 5.4 Set Railway build vars (`NEXT_PUBLIC_FEEDBACK_MODE=test`, `NEXT_PUBLIC_COMMIT_SHA=${{RAILWAY_GIT_COMMIT_SHA}}`), deploy, verify live widget end-to-end
- [ ] 5.5 Update DEPLOYMENT.md (new build vars), CHANGELOG.md entry, close GitHub issue #5
