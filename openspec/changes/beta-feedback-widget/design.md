# Design — Beta Feedback Widget

## Context

Private beta starts imminently; testers are non-technical (en/mr). The repo already has
the full module pattern (controller→service→repository), `@nestjs/throttler`,
`@Audited()`, `hasPermission()`, TanStack Query client with CSRF handling, shadcn/ui,
framer-motion, and next-intl — the widget composes existing approved pieces only.
Deployment is Railway with the same-origin proxy (`/api/v1/*` rewrite), so the widget's
API calls go through the normal `lib/api/client.ts` path unchanged.

## Goals / Non-Goals

**Goals:**
- Zero-friction capture: two required fields (type, title); everything else automatic.
- Dedup pressure: testers see open observations and +1 instead of re-reporting.
- Reports carry enough context to triage without a follow-up conversation.
- One env var flips test → public behaviour; no code change at launch.

**Non-Goals:**
- Screenshots, comment threads, email notifications, admin queue UI (later changes).
- Anonymous feedback — reporter is always the authenticated user.
- Realtime updates of the list (plain query refetch is fine).

## Decisions

**D1 — Data model: `FeedbackItem` + `FeedbackUpvote` join table.**
Upvotes as rows (`@@unique([feedbackItemId, userId])`) rather than a counter column:
gives idempotent toggle semantics and "did I upvote?" per user cheaply. Counter-cache
not needed at beta scale (aggregate `_count` in the list query).

**D2 — Context capture is client-supplied but server-stamped.**
Route, locale, viewport, commit SHA come from the client DTO (validated, length-capped);
`userAgent` is read server-side from the request header; `reporterId` and `role`
snapshot come from the session (never from the body). Rationale: client fields are
diagnostics, not security data; role is snapshotted at report time because a user's
role can change later.

**D3 — Status lifecycle enforced in the service.**
`NEW → TRIAGED → DONE | DECLINED` with `DECLINED` requiring `declineReason`.
Terminal states (`DONE`/`DECLINED`) are excluded from the tester-visible list by
default. Admin transitions are `@Audited()`.

**D4 — Widget mount point: a single client component in the authenticated layouts.**
`<FeedbackWidget />` rendered from the shared authenticated shell(s) — (app),
(vratmitra), (moderation), (admin) route groups — not in root layout (public/login
pages must not show it, and it needs a session for the API anyway). Rendered `null`
unless `NEXT_PUBLIC_FEEDBACK_MODE` is `test` or `public`.

**D5 — Drag + corner snap with framer-motion.**
`motion.button` with `drag`, no `dragConstraints` beyond the viewport; on `dragEnd`,
compute nearest corner from the release point and animate to it (spring). Corner id
(`tl|tr|bl|br`) — not raw coordinates — is persisted to `localStorage`, so it stays
valid across viewport sizes. Default `br`. Fixed positioning with safe-area insets;
z-index below toasts/dialogs, above content.

**D6 — Modes.**
- `test`: list tab (open items, +1) + raise tab.
- `public`: raise tab only — the GET list route stays admin-usable but the UI hides it.
- unset/other: component renders nothing (also tree-shaken behind the env check).
The mode is a **build-time** var (Dockerfile ARG + Railway build variable), consistent
with the other `NEXT_PUBLIC_*` vars.

**D7 — Commit SHA plumbing.**
Web Dockerfile gains `ARG NEXT_PUBLIC_COMMIT_SHA` (Railway passes
`${{RAILWAY_GIT_COMMIT_SHA}}`); fallback literal `dev`. Exposed to the client bundle;
attached to every report. Alternative (reading `.git` at build) rejected —
`.dockerignore` excludes it and Railway provides the SHA natively.

**D8 — Permissions.**
New resource `feedback` in the permission matrix: `create`/`read`/`upvote` for every
authenticated role; `manage` (status PATCH) admin-only. Enforced via
`hasPermission(user, resource, action)` per the hard rule; matrix rows added to
`spec/decisions/05_permissions.md` in the same PR.

**D9 — Throttling.**
`@Throttle` on create (e.g. 10/hour/user) and upvote (60/hour) mirroring the auth
controller's pattern — beta testers can't flood the table by accident.

## Risks / Trade-offs

- [Widget overlaps app UI on small screens] → corner snapping + safe-area insets +
  smaller button on `sm:`; it's also draggable away by the user.
- [Testers report duplicates anyway] → acceptable; the +1 list mitigates, triage dedupes.
- [Build-time mode var means a rebuild to change modes] → acceptable; mode changes
  coincide with deploys (beta → public launch).
- [Client-supplied context can be junk] → length-capped validated strings; junk context
  degrades diagnostics only, never correctness.

## Migration Plan

1. Prisma migration (`feedback_items`, `feedback_upvotes`) — additive, no existing-table
   changes; applied to prod manually per the hard rule (docker build-stage image).
2. Deploy api (routes inert until used), then web with
   `NEXT_PUBLIC_FEEDBACK_MODE=test` + `NEXT_PUBLIC_COMMIT_SHA` build vars.
3. Rollback: unset `NEXT_PUBLIC_FEEDBACK_MODE` and rebuild web (widget vanishes);
   tables can stay.

## Open Questions

None blocking. (Deferred: whether declined reasons should be visible to all testers or
only the reporter — v1 shows them to all in test mode, matching the transparency goal.)
