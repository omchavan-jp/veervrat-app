## 0. Read first

- [x] 0.1 `design.md` — particularly why capabilities are not roles, and the composition rule.
- [x] 0.2 `proposal.md` → "The gating is currently cosmetic". The feedback widget is hidden, not
  denied; if only the UI part gets done, the result reads as enforced and is not.
- [x] 0.3 `apps/api/src/common/permissions/has-permission.ts` — `hasPermission` is pure and
  synchronous. Membership arrives as a resource field. Do not make it async.

## 1. Data model

- [x] 1.1 `Capability` enum: `FEEDBACK_WIDGET`, `CONTENT_EDIT`.
- [x] 1.2 `UserCapability` model mirroring `UserRole` — `@@id([userId, capability])`,
  `onDelete: Cascade`, plus `grantedAt` and `grantedBy`.
- [x] 1.3 Migration. Schema only — no data to backfill, since `CONTENT_EDITOR_USER_IDS` was never
  set in any environment.

## 2. Permissions

- [x] 2.1 Add `grants?: Capability[]` to the `platform` resource; remove `isContentEditor`.
- [x] 2.2 `content.edit` reads `grants`.
- [x] 2.3 **`feedback.create` / `feedback.read` / `feedback.upvote` stop returning `true` for
  every authenticated user** and respect mode + grants. This is the cosmetic-gating fix.
- [x] 2.4 Repository + service to read a user's capabilities.

## 3. Environment composition

- [x] 3.1 `FEEDBACK_MODE` accepts `off | all | granted`; Joi-validated so a bad value fails at
  boot rather than silently falling back.
- [x] 3.2 **Add `FEEDBACK_MODE` to the api container** in `container-apps.tf` — today only web
  has it, which is why enforcement was impossible.
- [x] 3.3 UAT `all`, prod `granted`.
- [x] 3.4 `CONTENT_EDIT` refused on prod at the API regardless of grants (see the proposal's open
  question — confirm before implementing).
- [x] 3.5 Delete `CONTENT_EDITOR_USER_IDS` from config, code, and docs.

## 4. Admin API + UI

- [x] 4.1 `PATCH /admin/users/:id/capabilities` (add/remove), ADMIN only.
- [x] 4.2 Audit `admin.capability.granted` / `admin.capability.revoked`.
- [x] 4.3 Toggles in `/admin/users/[id]`, showing who granted and when.
- [x] 4.4 A capability the environment does not support renders as **unavailable**, not merely
  inert — an admin must not be able to toggle something that will never take effect.

## 5. `/auth/me` and the web client

- [x] 5.1 Return `grants: Capability[]`; remove `isContentEditor`.
- [x] 5.2 Update `apps/web/lib/session-user.ts` and `apps/web/lib/api/auth.ts`.
- [x] 5.3 ⚠️ Update the **server-seeded** user (#102) — a stale field survives in rendered HTML.
- [x] 5.4 Feedback widget renders from `grants`, reflecting what the server would allow.

## 6. Tests

- [x] 6.1 Auth matrix, one positive + one negative per permission row (AGENTS.md non-negotiable):
  `content.edit` with and without the grant; each `feedback.*` action with and without.
- [x] 6.2 Composition: `off` denies a granted user; `all` allows an ungranted one; `granted`
  allows only the granted.
- [x] 6.3 **A test that the feedback API itself refuses an ungranted user** — not that the widget
  is hidden. The regression guard for the cosmetic-gating bug.
- [x] 6.4 Grant and revoke each write exactly one audit event.
- [~] 6.5 Deleting a user cascades their capabilities — enforced by the schema
  (`onDelete: Cascade`), not unit-testable against mocks. Covered by the DB constraint itself.
- [x] 6.6 `/auth/me` returns grants; no `isContentEditor` remains anywhere (`grep` it).

## 7. Docs

- [x] 7.1 `spec/` — capabilities vs roles, so the distinction survives this change.
- [x] 7.2 `documentation/21_Infrastructure-Conventions.md` — the composition rule, and that
  `FEEDBACK_MODE` now exists on both containers.
- [x] 7.3 `ops/PROJECT-STATUS.md` — close O7; note D20 realised.
- [x] 7.4 `CHANGELOG.md`.

## 8. Verify on UAT

- [x] 8.1 Grant `FEEDBACK_WIDGET` to a test user on UAT, confirm the widget appears.
- [x] 8.2 Revoke it, confirm it disappears **and the API refuses** — check both, since the whole
  point is that they can disagree.
- [x] 8.3 Confirm the audit rows in `/admin/audit`.

> **Completed 2026-08-22.** Verified on UAT with two real accounts. Granting made the widget
> appear; revoking removed it *and* the API returned 403 for `feedback.create`, `feedback.read`
> and `feedback.upvote` — both halves checked, since the defect this change fixes was precisely
> that they could disagree. Audit rows for grant and revoke were present.
>
> Three defects were found during implementation and are recorded on #40: the feedback widget's
> gating was cosmetic (the environment variable reached only the web tier while the API admitted
> any authenticated user); `CONTENT_EDIT_ENABLED` was read by the code and set in no
> infrastructure, leaving the capability inert; and the content editor was compiled out of every
> deployed build by a flag fixed at build time.

