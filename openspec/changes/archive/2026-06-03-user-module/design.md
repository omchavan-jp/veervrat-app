## Context

Auth module owns everything about identity: sessions, credentials, OAuth, password reset. It exposes `GET /auth/me` which returns a minimal `SessionUser` (id, email, displayName, username, language, roles). This is intentionally thin — auth should not own profile aggregation.

The User module owns the user as a domain entity: profile reads/writes, public profile, and username uniqueness outside the onboarding context. These are distinct concerns that need to live in a separate module per Backend Conventions (one module per domain concept).

No new DB columns needed — all fields exist on the `User` model: `displayName`, `username`, `avatarUrl`, `gender`, `dob`, `language`, `showLastActive`, `showOnlineIndicator`, `profilePrivate`, `lastActiveAt`, `createdAt`, `updatedAt`.

## Goals / Non-Goals

**Goals:**
- Own profile read/write for authenticated users
- Public profile lookup by username, respecting privacy settings
- Username availability check supporting the profile edit flow
- Strict privacy enforcement: private profiles return 404 (not 403) to avoid leaking existence; hidden fields are absent entirely from responses

**Non-Goals:**
- Avatar upload (file upload endpoint — deferred to item 22/upload module)
- Per-field privacy toggles stored in DB (only global profilePrivate + showLastActive + showOnlineIndicator exist in schema; full per-field toggles are account settings scope, item 32)
- Public profile stats aggregation beyond what can be derived from counts (journey counts, test counts, experience log counts) — those counts require related data queries, which we include
- Follow/unfollow (items 10/23)
- Meilisearch user indexing (item 24)

## Decisions

### D1: `GET /users/me` vs `GET /auth/me`

`GET /auth/me` returns `SessionUser` — the minimal identity payload needed for session validation and permission checks. `GET /users/me` returns the full editable profile (all displayable/editable fields). These are different response shapes serving different consumers. Both routes coexist; no overlap.

### D2: Public profile returns 404 for private profiles

Per spec/10: "Full profile privacy: toggle — public / private (hidden from guests and non-followers)." When `profilePrivate = true`, the endpoint returns 404, not 403. This avoids leaking that the username exists. Consistent with API Conventions §6: "use 404 rather than 403 when revealing the resource's existence is itself a privacy leak."

### D3: Hidden fields are absent, not null

When `showLastActive = false`, the `lastActive` field is omitted entirely from the response object. When `showOnlineIndicator = false`, `isOnline` is omitted. This is enforced in the service layer, not in the repository — repository returns full data, service filters before returning to controller.

### D4: Last active granularity

`lastActiveAt` is stored as a full timestamp but exposed as a human-readable relative label ("Today", "1 day ago", etc.) per spec/10. Calculation: server-side in the service layer, string returned in response. We expose both `lastActive` (string label) and the raw `memberSince` (ISO date) for display.

### D5: Public profile stats — counts only from journeys, tests, experience logs

Public profile shows counts of: journeys completed, tests taken, active journeys. These require aggregation queries from the `journeys` and `test_attempts` tables. We include these in `UsersRepository.findPublicProfile()` via Prisma `_count`. Experience log public entries count also included. No sentence-level data, no scores.

### D6: `PATCH /users/me` username uniqueness

When updating username, the service checks uniqueness (same as auth service's `checkUsernameAvailability`). The username regex (`/^[a-z0-9_]{3,30}$/`) is validated at DTO level. A separate `GET /users/check-username?username=X` endpoint supports the live check in the edit profile UI. This mirrors the auth/check-username endpoint but lives at the users path to maintain module separation.

### D7: UsersModule does not import AuthModule

UsersRepository queries `prisma.user` directly — it does not call AuthRepository or AuthService. The auth module's `SessionGuard` is used for route-level authentication (guards are cross-module by design in NestJS). No circular dependency.

## Risks / Trade-offs

- **Last active relative label is server-calculated** → timezone assumption. We use UTC difference in days. Acceptable for v1; a richer timezone-aware label can be added later.
- **No real-time online status** → `isOnline` derived from `lastActiveAt` within last N minutes (5 min). Not a live socket presence signal — that requires WebSocket connection tracking (item 20). For now, a field set on API activity via middleware; we'll mark the approach in code.
- **`showLastActive` / `showOnlineIndicator` only** — per-field stat toggles (journeys, tests, etc.) are not yet in schema. Those belong to item 32. Public profile currently exposes all stat counts if `profilePrivate = false`. This is correct for v1 per spec/10 defaults (all public by default).
