# Design: Admin user management

## Module layout

New `modules/admin-users/` — kept separate from the Item 30 `admin` (content) module so each
stays cohesive. Depends on existing **services** cross-module (never foreign repositories):
- `AuthService` / its repository seam for session deletion (force-logout).
- `InvitationsService` for cancelling pending invitations on anonymise.
- `JourneysRepository.updateState` is in another module → call via a thin
  `JourneysService.adminOverrideState()` wrapper (services, not repos, across modules).

```
modules/admin-users/
  admin-users.module.ts
  admin-users.controller.ts   admin-users.service.ts
  admin-users.repository.ts    (Prisma for user reads/writes admin needs)
  dto/
```

## Authorization

Two layers (CLAUDE.md): `SessionGuard` + service `hasPermission(user,{type:'platform'},
'admin.manage_users' | 'admin.view_any_user' | 'admin.override_journey_state')`. All cases
already exist in `has-permission.ts` (admin-only). No new permission rows.

Reads (`GET /admin/users`, `:id`) gate on `admin.view_any_user`; writes on
`admin.manage_users`; journey override on `admin.override_journey_state`.

## Account-state enforcement (security-critical)

`validateSession` currently rejects `deletedAt`. Add a `suspendedAt` rejection in the same
place so suspension takes effect on the **next request** for existing sessions; suspend also
proactively deletes all sessions for an immediate cut-off. `auth.service` login path rejects
suspended users too (mirror the existing deleted/unverified checks) so they can't re-login.
Anonymise sets `deletedAt` (already blocked) + `suspendedAt` defensively.

## Self-lockout guards

- Role change: an admin cannot remove their **own** `ADMIN` role (would lock themselves out).
- Suspend / anonymise: an admin cannot suspend or anonymise **their own** account via this
  surface (avoids accidental self-lockout; self-deletion is the account-settings flow).

## Anonymisation (spec/06 §19, §30, §31)

Single service method in a `$transaction` where possible (session deletion is outside the
user-row tx but ordered after):
1. Replace PII: `displayName='[Deleted user]'`, `email=anon-{shortid}@deleted.invalid`,
   `username=deleted_{shortid}`, `avatarUrl=null`. The shortid is derived from the user id
   (no `Math.random`/`Date.now` — those are fine in request code, but a deterministic slice
   of the uuid keeps it stable and collision-free given uuid uniqueness).
2. Set `anonymisedAt=now`, `deletedAt=now`, `suspendedAt=now`.
3. Delete all sessions (force-logout).
4. Cancel pending invitations sent by the user via `InvitationsService` (spec/06 §31) —
   notify invitees handled by that service's existing cancel path if present; otherwise mark
   `CANCELLED`.
5. **Content retained**: journeys, ERC, tests, experience logs, blogs, sidenotes, chat — all
   keyed by the (now-pseudonymous) user id; rendering resolves the new displayName, so they
   show as "[Deleted user]". No body scrubbing in v1 (non-goal).

Irreversible — the UI confirms with a typed reason; the reason goes to audit metadata.

## Journey state override

Reuse `JourneysRepository.updateState(id, state)` behind a new
`JourneysService.adminOverrideState(adminUser, journeyId, state)` that checks
`admin.override_journey_state` and 404s on missing journey. Controller lives in
`admin-users` (admin surface) at `PATCH /admin/journeys/:id/state`; reason is required and
captured in audit metadata (not persisted on the journey — emergency action, the audit log
is the record). `from`/`to` states in metadata.

## Audit

Every write `@Audited`, matching spec/17's mandatory admin events:
- `admin.manage_user_role` (metadata: added/removed + role names)
- `admin.suspend_user` / `admin.unsuspend_user`
- `admin.force_logout`
- `admin.anonymise_user` (metadata: reason)
- `admin.override_journey_state` (metadata: from_state, to_state, reason)

`resource_id` = the target **user id** (a uuid → safe to use `resourceIdParam: 'id'`); for
journey override, the journey id. (Per the Audit-Schema note: only uuids go in resource_id.)

## Reads

`AdminUsersRepository` does direct Prisma reads (admin sees all — no scoping):
- list: `user.findMany` with roles + `_count`, cursor on id, optional `q` OR-filter on
  displayName/username/email (case-insensitive `contains`).
- detail: one `user.findUnique` with roles, journeys (state + sentence text + weakness),
  test attempts (weakness + score + submittedAt), experience logs (id + visibility +
  createdAt + excerpt). Shapes mirror existing read DTOs where practical.

## Audit dashboard (Ledger #17)

No backend change — `GET /admin/audit-events` exists (Item 27). Add `lib/api/audit.ts` +
`/admin/audit` page: filterable (action, actor) cursor list, rendered as a table with
timestamp/actor/action/resource/metadata.

## Frontend

`(admin)` group (shared shell + `useAdminGuard`). New pages: `/admin/users`,
`/admin/users/[id]`, `/admin/audit`. New dashboard cards (Users, Audit log). New
`lib/api/admin-users.ts` + `audit.ts`; query-keys `adminUsers.*`, `audit.*`. React Hook
Form + Zod for the reason-bearing destructive actions; confirm dialogs for
suspend/anonymise/override. i18n `adminUsers.*` + `audit.*`, en/mr parity.

## Testing

- Auth matrix: positive + negative per new permission row (admin can / non-admin cannot:
  list, view, role-change, suspend, force-logout, anonymise, journey-override).
- Service unit tests: self-ADMIN-removal blocked; self-suspend/anonymise blocked; suspend
  deletes sessions; anonymise replaces PII + sets flags + cancels invites + retains content
  (mock repo asserts); override sets state + audits reason.
- Auth: suspended user's `validateSession` returns null (session rejected).
- Web: pages render; destructive actions wired with confirm.

## Non-goals (deferred onward)
- Platform Stats dashboard.
- Deep body-level scrubbing of chat/sidenote content on anonymise.
- Bulk user actions; CSV export.
