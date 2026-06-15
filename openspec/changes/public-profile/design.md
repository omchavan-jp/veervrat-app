## Context

The public profile baseline exists: `GET /users/:username` returns per-field-visible stats with private-profile handling, and `/u/[username]` renders them. The `UserFollow` table (composite PK `followerId`+`followeeId`) is migrated but unused. `follow.create`/`follow.remove` permission rows and the `NEW_FOLLOWER` notification enum value already exist. Item 22 left `experience_log.view` FRIENDS fail-closed, explicitly pending this item's follow system.

## Goals / Non-Goals

**Goals:**
- One-way follow/unfollow (auth-required, self-follow rejected, idempotent), with follower/following counts and the requester's follow status on the profile.
- VM credibility stat: COMPLETED journeys this user was the assigned VM for; shown only when > 0.
- `GET /users/:username/experience-logs`: the user's PUBLIC published entries, paginated, guest-accessible.
- Enforce Friends-tier experience-log visibility via mutual follow (closes the Item 22 deferral).
- `NEW_FOLLOWER` notification on follow.
- Frontend: follow button + counts + credibility + public experiences on `/u/[username]`; counts on own profile.

**Non-Goals:**
- **Follow feed / activity stream** — spec/10 explicitly defers to a future version.
- Notifications on unfollow (only follow notifies).
- Meilisearch-backed user search (Item 24) — profile discovery links already work via `/u/username`.

## Decisions

### 1. New `follows` module owning the social graph
A dedicated module (controller → service → repository) owns `UserFollow` reads/writes and exposes `FollowsService` for cross-module use (users profile counts/status; experience-logs friendship check). Rationale: the social graph is its own concern; the users module stays focused on identity/profile, and cross-module access goes through `FollowsService` (never the repository) per the CLAUDE.md layering rule.

### 2. Follow targets resolved by username, acted on by id
Endpoints are `POST/DELETE /users/:username/follow` (profile-discoverable URLs use usernames). The service resolves username→id via `UsersService`, rejects self-follow, and upserts/deletes the `UserFollow` row. Idempotent: following an already-followed user is a no-op success; unfollowing a non-followed user is a no-op success. Rationale: matches the profile URL scheme and avoids leaking ids.

### 3. Friends-tier enforcement: service resolves friendship, passes a derived boolean
The permission function is pure (no DB). Rather than inject a repository, the experience-logs service resolves mutual-follow via `FollowsService.areMutualFollows(viewerId, authorId)` and passes the result as a new optional field on the experience-log permission resource (`viewerIsFriend`). `experience_log.view` then allows FRIENDS when `viewerIsFriend === true`. Rationale: keeps `has-permission` pure and synchronous (its core design invariant); the async DB lookup stays in the service. Alternative (make the permission fn async / inject a repo) rejected — it would break every existing call site and the function's purity contract.

### 4. Credibility stat computed in the users repository
"Guided X journeys to completion" = `count(JourneyVmAssignment where vmId = user AND journey.state = COMPLETED)`. Computed alongside the other profile counts in `findByUsername`. Surfaced on the DTO only when > 0 (spec/10: shown "if user has acted as VM"). No new privacy toggle — it's a public credibility signal, always shown when non-zero. Rationale: matches spec/22 (credibility derived from completed-journey VM assignments; not a togglable field).

### 5. Public experience entries: reuse experience-logs, scoped to one author
`GET /users/:username/experience-logs` returns that author's PUBLIC, non-draft, non-deleted entries, paginated (cursor) — the same filter as the public pool but constrained to one author. Implemented in the experience-logs repository (`findPublicByAuthor`) and exposed via the users controller (which already owns `/users/:username`) calling `ExperienceLogsService`. Guest-accessible (OptionalSessionGuard). Rationale: one source of truth for "public experience entry" filtering; avoids duplicating the visibility rule.

### 6. `:username` routes get OptionalSessionGuard
`GET /users/:username`, `GET /users/:username/experience-logs` use `OptionalSessionGuard` so a logged-in requester is resolved (for `isFollowing`/`followsYou`) while guests still get the public view. The follow mutation routes use `SessionGuard` (auth required — guests cannot follow, spec/10).

## Risks / Trade-offs

- **[Self-follow / duplicate rows]** → Service rejects self-follow (400) and uses upsert/delete so the composite-PK table never errors on repeat calls. Covered by tests.
- **[Friendship check N+1 on the public pool]** → The pool itself shows PUBLIC entries (no friendship needed). Friendship is resolved only on single-entry FRIENDS view and on a user's profile experience list (PUBLIC only) — both O(1) lookups. No pool-wide fan-out.
- **[Private profile + follow]** → A private profile returns 404; the follow endpoints resolve the user by username independent of `profilePrivate`, so following is still possible from a name link even if the profile page is hidden. Spec is silent; default to allowing follow (the relationship, not the profile view, is the social primitive). Recorded.
- **[NEW_FOLLOWER notification spam]** → Only fires on a transition to followed (not on idempotent re-follow). Verified by checking the row didn't already exist before notifying.
- **[experience_log.view signature change]** → Adding `viewerIsFriend?` is optional/back-compatible; existing call sites (chat-tagged journey logs) pass nothing and keep current behavior. The experience-logs service is the only caller that resolves and passes it.

## Migration Plan

No schema migration (`UserFollow` exists). Ship follows module → users profile augmentation → Friends-tier enforcement → frontend. The `experience_log.view` change is additive (new optional input); re-run the full permission + experience-log suites.
