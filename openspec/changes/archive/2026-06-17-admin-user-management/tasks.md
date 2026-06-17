# Tasks: Admin user management

## 1. Schema & migrations
- [x] 1.1 Add `User.suspendedAt`, `User.anonymisedAt` (nullable timestamps)
- [x] 1.2 `prisma migrate dev` (dev), apply to test DB, regen client; `migrate status` clean

## 2. Auth — account-state enforcement
- [x] 2.1 `validateSession` rejects `suspendedAt` (in addition to `deletedAt`)
- [x] 2.2 Login path rejects suspended users (auth.service)
- [x] 2.3 Expose a session-deletion seam to admin-users (AuthService.forceLogout(userId))

## 3. Backend — admin-users module (reads)
- [x] 3.1 Module scaffold (imports Auth, Journeys, Invitations)
- [x] 3.2 `GET /admin/users` (paginated, roles, status, `?q=`) — `admin.view_any_user`
- [x] 3.3 `GET /admin/users/:id` (profile + journeys + tests + experience logs, read-only)

## 4. Backend — writes (all @Audited, admin.manage_users)
- [x] 4.1 `PATCH /admin/users/:id/roles` (add/remove; self-ADMIN-removal blocked)
- [x] 4.2 `POST /admin/users/:id/suspend` (set/clear suspendedAt + force-logout; self-suspend blocked)
- [x] 4.3 `POST /admin/users/:id/force-logout`
- [x] 4.4 `POST /admin/users/:id/anonymise` (PII→pseudonym, deletedAt+anonymisedAt, sessions killed, pending invites cancelled, content retained; self-anonymise blocked)
- [x] 4.5 `PATCH /admin/journeys/:id/state` (reason required; via JourneysService.adminOverrideState; `admin.override_journey_state`)

## 5. Tests (alongside)
- [x] 5.1 Auth matrix: positive+negative per new permission row
- [x] 5.2 Service unit: self-ADMIN-removal, self-suspend/anonymise blocked; suspend kills sessions; anonymise replaces PII+flags+cancels invites; override sets state+audits reason
- [x] 5.3 validateSession rejects suspended; fix any spec mocks broken by new deps; full API suite green

## 6. Frontend — (admin) extension
- [x] 6.1 `lib/api/admin-users.ts` + `lib/api/audit.ts` + query-keys; nav/dashboard cards (Users, Audit log)
- [x] 6.2 `/admin/users` list (search, status badges, paginated)
- [x] 6.3 `/admin/users/[id]` detail (read-only profile/journeys/tests/logs; role mgmt; account actions w/ confirm+reason; per-journey override)
- [x] 6.4 `/admin/audit` dashboard (action/actor filters, cursor) — pays Ledger #17
- [x] 6.5 i18n en/mr parity; web tests; both prod builds pass

## 7. Verification gate & close-out
- [x] 7.1 API + web typecheck; both prod builds; full suites green
- [x] 7.2 Probe: positive + 403 + 404 + suspend-blocks-login + anonymise-retains-content; browser verify; console clean
- [x] 7.3 Cleanup test data; revert temp admin grant
- [x] 7.4 `openspec validate` + `archive`; update Deferral Ledger (#17 done, #18 progressed) + memory
- [x] 7.5 Merge `feat/admin-users` → dev (squash)

## Deferrals recorded
- Platform Stats dashboard = separate item.
- Deep body-level scrub of chat/sidenote content on anonymise (v1 anonymises identity only).
