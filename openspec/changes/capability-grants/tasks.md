## 0. Read first

- [ ] 0.1 `design.md` — particularly why capabilities are not roles, and the composition rule.
- [ ] 0.2 `proposal.md` → "The gating is currently cosmetic". The feedback widget is hidden, not
  denied; if only the UI part gets done, the result reads as enforced and is not.
- [ ] 0.3 `apps/api/src/common/permissions/has-permission.ts` — `hasPermission` is pure and
  synchronous. Membership arrives as a resource field. Do not make it async.

## 1. Data model

- [ ] 1.1 `Capability` enum: `FEEDBACK_WIDGET`, `CONTENT_EDIT`.
- [ ] 1.2 `UserCapability` model mirroring `UserRole` — `@@id([userId, capability])`,
  `onDelete: Cascade`, plus `grantedAt` and `grantedBy`.
- [ ] 1.3 Migration. Schema only — no data to backfill, since `CONTENT_EDITOR_USER_IDS` was never
  set in any environment.

## 2. Permissions

- [ ] 2.1 Add `grants?: Capability[]` to the `platform` resource; remove `isContentEditor`.
- [ ] 2.2 `content.edit` reads `grants`.
- [ ] 2.3 **`feedback.create` / `feedback.read` / `feedback.upvote` stop returning `true` for
  every authenticated user** and respect mode + grants. This is the cosmetic-gating fix.
- [ ] 2.4 Repository + service to read a user's capabilities.

## 3. Environment composition

- [ ] 3.1 `FEEDBACK_MODE` accepts `off | all | granted`; Joi-validated so a bad value fails at
  boot rather than silently falling back.
- [ ] 3.2 **Add `FEEDBACK_MODE` to the api container** in `container-apps.tf` — today only web
  has it, which is why enforcement was impossible.
- [ ] 3.3 UAT `all`, prod `granted`.
- [ ] 3.4 `CONTENT_EDIT` refused on prod at the API regardless of grants (see the proposal's open
  question — confirm before implementing).
- [ ] 3.5 Delete `CONTENT_EDITOR_USER_IDS` from config, code, and docs.

## 4. Admin API + UI

- [ ] 4.1 `PATCH /admin/users/:id/capabilities` (add/remove), ADMIN only.
- [ ] 4.2 Audit `admin.capability.granted` / `admin.capability.revoked`.
- [ ] 4.3 Toggles in `/admin/users/[id]`, showing who granted and when.
- [ ] 4.4 A capability the environment does not support renders as **unavailable**, not merely
  inert — an admin must not be able to toggle something that will never take effect.

## 5. `/auth/me` and the web client

- [ ] 5.1 Return `grants: Capability[]`; remove `isContentEditor`.
- [ ] 5.2 Update `apps/web/lib/session-user.ts` and `apps/web/lib/api/auth.ts`.
- [ ] 5.3 ⚠️ Update the **server-seeded** user (#102) — a stale field survives in rendered HTML.
- [ ] 5.4 Feedback widget renders from `grants`, reflecting what the server would allow.

## 6. Tests

- [ ] 6.1 Auth matrix, one positive + one negative per permission row (AGENTS.md non-negotiable):
  `content.edit` with and without the grant; each `feedback.*` action with and without.
- [ ] 6.2 Composition: `off` denies a granted user; `all` allows an ungranted one; `granted`
  allows only the granted.
- [ ] 6.3 **A test that the feedback API itself refuses an ungranted user** — not that the widget
  is hidden. The regression guard for the cosmetic-gating bug.
- [ ] 6.4 Grant and revoke each write exactly one audit event.
- [ ] 6.5 Deleting a user cascades their capabilities.
- [ ] 6.6 `/auth/me` returns grants; no `isContentEditor` remains anywhere (`grep` it).

## 7. Docs

- [ ] 7.1 `spec/` — capabilities vs roles, so the distinction survives this change.
- [ ] 7.2 `documentation/21_Infrastructure-Conventions.md` — the composition rule, and that
  `FEEDBACK_MODE` now exists on both containers.
- [ ] 7.3 `ops/PROJECT-STATUS.md` — close O7; note D20 realised.
- [ ] 7.4 `CHANGELOG.md`.

## 8. Verify on UAT

- [ ] 8.1 Grant `FEEDBACK_WIDGET` to a test user on UAT, confirm the widget appears.
- [ ] 8.2 Revoke it, confirm it disappears **and the API refuses** — check both, since the whole
  point is that they can disagree.
- [ ] 8.3 Confirm the audit rows in `/admin/audit`.
