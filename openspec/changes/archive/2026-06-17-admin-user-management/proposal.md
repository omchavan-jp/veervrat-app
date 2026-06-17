# Proposal: Admin user management

## Why

Item 31 of `documentation/03_Implementation-Order.md`. Admins can manage content (Item 30)
but have no way to manage **users** — view accounts, assign/remove roles, or take account
actions (suspend, force-logout, anonymise). The audit-event **backend** has existed since
Item 27 (`GET /admin/audit-events`) but has **no UI** (Deferral-Ledger #17). This item
delivers both, and annotates every new privileged action with `@Audited` (#18).

## What changes

### Database
- Migration: add `User.suspendedAt` and `User.anonymisedAt` (both nullable timestamps).
  `deletedAt` already exists and is the soft-delete marker; `anonymisedAt` records when PII
  was pseudonymised (content retained), and anonymise also sets `deletedAt`.

### Backend (NestJS) — admin-only, all writes `@Audited`
New `admin-users` module (separate from the Item 30 `admin` content module):
- `GET /api/v1/admin/users` — paginated list (cursor), each with roles, status flags
  (suspended/anonymised), counts; optional `?q=` name/username/email substring.
- `GET /api/v1/admin/users/:id` — full read-only profile: account fields, roles, all
  journeys (with state + sentence/weakness), all test attempts (with score), all experience
  logs. Admin sees everything — no ABAC scoping.
- `PATCH /api/v1/admin/users/:id/roles` — `{ add?: Role[], remove?: Role[] }`; cannot remove
  one's own ADMIN role (lock-out guard).
- `POST /api/v1/admin/users/:id/suspend` — `{ suspended: boolean }`; suspending sets
  `suspendedAt` and force-logs-out (deletes all sessions); unsuspending clears it.
- `POST /api/v1/admin/users/:id/force-logout` — deletes all sessions (no flag change).
- `POST /api/v1/admin/users/:id/anonymise` — `{ reason }`: replace PII (displayName, email,
  username, avatarUrl) with a pseudonymous token, set `anonymisedAt` + `deletedAt`, delete
  all sessions, auto-cancel pending invitations sent by the user (spec/06 §31), retain
  journey/ERC/test/log content. Irreversible.
- `PATCH /api/v1/admin/journeys/:id/state` — emergency override; `{ state, reason }` (reason
  required); reuses `JourneysRepository.updateState`. Admin-only.

### Auth — enforce account state
- `validateSession` already rejects `deletedAt`; **add** `suspendedAt` rejection so a
  suspended (or anonymised) user's existing/new sessions are denied (login also rejects
  suspended in `auth.service`).

### Frontend (Next.js) — extend the `(admin)` group
- `/admin/users` — searchable, paginated user list with status badges.
- `/admin/users/[id]` — read-only profile + journeys/tests/logs; role management;
  account-action buttons (suspend/unsuspend, force-logout, anonymise w/ confirm+reason);
  per-journey "override state" (emergency, reason).
- `/admin/audit` — audit-event dashboard (Ledger #17) over the existing
  `GET /admin/audit-events` (action/actor filters, cursor).
- Dashboard cards (Users, Audit log) + nav already routes under `(admin)`.

## Impact

- New `modules/admin-users/` (controller/service/repository/dto). Touches `auth.service`
  (suspend block), `schema.prisma` (1 migration), `invitations` (cancel-pending on
  anonymise — via service), web `(admin)` group + `lib/api/admin-users.ts` + `audit.ts`.
- No new runtime dependencies.

## Non-goals (deferred)
- Platform Stats dashboard (separate item).
- GDPR/legal export, hard-delete (spec/06: anonymise-not-delete is the v1 model).
- Anonymising chat/sidenote *bodies* in place — spec/06 says display as "[Deleted user]";
  we anonymise the author identity (the rendering layer already resolves names), bodies are
  retained as-is. Recorded as a deferral if deeper scrubbing is later required.
