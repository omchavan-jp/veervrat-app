# Beta Feedback Widget

Tracked as GitHub issue [#5](https://github.com/veer-vrat/veervrat-app/issues/5).
Process context: `documentation/20_Solo-Dev-Operations.md` (Loop 1 — Capture).

## Why

The app is entering private beta with non-technical test users (many Marathi-speaking).
There is no in-app way for them to report defects or suggest improvements, and external
channels (WhatsApp/email) lose the context that makes reports actionable (route, role,
locale, build). A zero-friction in-app capture channel is the gating item before handing
the app to testers.

## What Changes

- New `feedback` backend module: authenticated users can raise observations
  (`ISSUE` | `IMPROVEMENT`), list open observations, and +1 (upvote-toggle) existing
  ones; admins can update status (`NEW → TRIAGED → DONE | DECLINED`, with an optional
  decline reason). Reports auto-capture client context (route, role, locale, viewport,
  user agent, commit SHA).
- New floating feedback widget on the web app: a draggable button that snaps to any of
  the four viewport corners (position persisted in `localStorage`), opening a modal with
  an observations list + raise-new form. Fully bilingual (en/mr).
- Widget visibility is controlled by `NEXT_PUBLIC_FEEDBACK_MODE`:
  `test` = full widget (list + form) for all authenticated users;
  `public` = form only (list hidden); unset = widget not rendered.
- Build metadata plumbing: `RAILWAY_GIT_COMMIT_SHA` surfaced to the browser as
  `NEXT_PUBLIC_COMMIT_SHA` (fallback `dev`) so reports identify the build.
- Permission matrix (`spec/decisions/05_permissions.md`) gains rows for the feedback
  resource, enforced via `hasPermission()`.

Out of scope (deliberately, v1): screenshot attachments, comment threads, email
notifications, and a dedicated admin queue UI (admins manage via API/status PATCH;
a minimal admin list page can be a later change).

## Capabilities

### New Capabilities
- `feedback-capture`: raising observations with auto-captured context, listing open
  observations, upvote-toggle — the API contract and its permission rules.
- `feedback-triage`: admin status lifecycle (`NEW/TRIAGED/DONE/DECLINED`), decline
  reasons, audit logging of admin actions.
- `feedback-widget`: the floating corner-snapping button + modal UX, mode gating
  (`test`/`public`/off), context auto-capture, i18n.

### Modified Capabilities

None — no existing spec's requirements change. (The permission matrix gains additive
rows; `spec/decisions/05_permissions.md` is updated as part of implementation.)

## Impact

- **Database**: new `feedback_items` and `feedback_upvotes` tables (Prisma migration;
  UUID PKs, `created_at`/`updated_at` per DB rules).
- **API**: new routes under `/api/v1/feedback` (POST, GET list, POST `/:id/upvote`,
  PATCH `/:id`); throttling on create; `@Audited()` on admin status changes.
- **Web**: new widget components mounted across all authenticated layouts; TanStack
  Query + React Hook Form + Zod; framer-motion for drag/snap (already approved);
  new `en.json`/`mr.json` message keys.
- **Build/deploy**: two web build vars (`NEXT_PUBLIC_FEEDBACK_MODE`,
  `NEXT_PUBLIC_COMMIT_SHA` from `RAILWAY_GIT_COMMIT_SHA`) — Dockerfile ARGs + Railway
  variable settings; DEPLOYMENT.md updated.
- **No new dependencies** — everything uses the approved catalog
  (`documentation/10_Platform-Engineering-Standard.md`).
