# Testing Strategy — v1

## Philosophy
Test behavior, not implementation. Write tests alongside code — not after. The goal is confidence in correctness, not coverage metrics.

---

## Stack

| Layer | Tool | Scope |
|---|---|---|
| Backend unit | Vitest | Service layer logic — business rules, state transitions, validation |
| Backend integration | Vitest + supertest | Repository layer against real test DB (Postgres in Docker) |
| Backend API | Vitest + supertest | Controller endpoints — request/response contracts, auth enforcement |
| Frontend component | Vitest + React Testing Library | Interactive components with user events — forms, state, conditional rendering |
| E2E | Playwright | Critical user flows end-to-end in a real browser |

---

## What to Test

### Backend — unit (service layer)
- ERC status transitions: valid transitions succeed, invalid transitions throw
- Journey lifecycle state machine: `not_started → active → completed`, `paused`, `dormant` transitions
- Challenge suggestion threshold logic: default vs VM override, enabling conditions
- Suggestion algorithm: lowest-scored sentences from latest test result
- VM scoping: global VM sees all, journey VM sees assigned only
- Draft model: test drafts and experience log drafts
- Invitation: expiry logic, cancellation, edge cases (pending invite + new global VM)
- Account anonymisation: correct fields pseudonymised, content retained

### Backend — integration (repository layer)
- Hit real test DB — **no mocks for the database layer**
- Query correctness: ERC union filter on weakness attachment, polymorphic tag queries, search queries
- Cascade behavior: account deletion → anonymisation propagation, journey deletion → ERC cascade
- Transaction integrity: concurrent ERC approvals, simultaneous journey start on same sentence

### Backend — API (controller layer)
- Auth enforcement: every protected endpoint returns 401 without session, 403 without permission
- Permission matrix: **role × action × resource-state matrix tests** — this is the most critical test category
  - VA can/cannot on own journey vs another VA's journey
  - Journey VM can view assigned journey but not others
  - Global VM can view all of VA's data
  - Moderator sees ERC review context but not journey contents
  - Admin override is audit-logged
- Request validation: invalid DTOs return 400 with field-level errors
- Response shape: `{ data }` on success, `{ statusCode, error, message }` on error

### Frontend — component
- Forms: validation errors appear, submission triggers correct API call, loading/success/error states
- Conditional rendering: role-based UI (VM nav items only for VMs, admin panel only for admins)
- Test flow: answer selection, draft save, submission, report display
- Journey interior: tab switching, ERC status display, deactivate/remove flow
- i18n: components render correctly in both EN and MR

### E2E — Playwright (10 critical flows)
1. Signup → onboarding → framework walkthrough → take test → see report
2. Start journey from test result → select ERC → start exposure → log check-in
3. VM invitation → accept → suggest ERC → VA accepts → VA submits for closure → VM approves
4. VM invitation for non-platform user → signup via invite link → accept VM role
5. Global VM swap → migration UI → keep/replace per journey
6. Custom ERC creation → submit for review → moderator edits and approves → appears in global pool
7. Blog creation → publish → comment → author hides comment → moderator deletes comment
8. Admin: override journey state → verify audit log entry
9. Guest: browse weaknesses → browse Pothi → hit soft prompt on test attempt → sign up
10. Draft test: start test → exit → resume from draft → complete

---

## What NOT to Test
- Prisma queries in isolation (test via repository integration tests)
- Controller logic in isolation (controllers should have no logic)
- shadcn/ui component internals (they're third-party)
- Static pages with no interactivity
- CSS styling (visual regression deferred to v2)

---

## Auth Matrix Tests — Required Coverage

This is the highest-priority test category. Must cover:

```
For each permission in the Layer 1 + Layer 2 matrix (spec/decisions/05_permissions.md):
  - Correct role CAN perform the action → 200/201
  - Wrong role CANNOT → 403
  - No session → 401
  - Scoping: own resource → allowed, other's resource → 403
  - Global VM vs journey VM scoping difference
```

Minimum: one positive and one negative test per permission row.

---

## Test DB
- Separate Postgres instance via Docker (same `docker-compose.yml`, different DB name)
- Prisma migrations run before test suite
- Each test suite seeds its own data and cleans up after (transaction rollback or truncate)
- No shared mutable state between test files

---

## CI Integration
- All tests run on PR — merge blocked if any fail
- Backend tests: `pnpm --filter api test`
- Frontend tests: `pnpm --filter web test`
- E2E: `pnpm --filter web test:e2e` (requires running backend + DB)
- No minimum coverage threshold in v1 — focus on critical path coverage, not percentage
