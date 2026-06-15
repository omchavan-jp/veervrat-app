## Why

The public profile shell already exists (per-field privacy, private-profile handling, stats at `GET /users/:username` + `/u/[username]` page), but three spec/10 + spec/22 requirements are unbuilt: the **follow system** (one-way follow, auth-required), the **VM credibility stat** ("Guided X journeys to completion"), and the **public experience entries** surfaced on the profile (not just a count). The follow system is also the prerequisite that unblocks the deferred **Friends-tier** visibility enforcement from Item 22 (Friends = mutual follows). Item 23 completes the public profile and the social-graph primitive the rest of the community features build on.

## What Changes

- **Backend — follow system:** new `follows` module. `POST /api/v1/users/:username/follow` and `DELETE /api/v1/users/:username/follow` (auth required, one-way, self-follow rejected, idempotent). Follower/following counts and the requester's `isFollowing` / `followsYou` status threaded into the public profile. A `NEW_FOLLOWER` notification fires on follow.
- **Backend — public profile completion:** add the VM credibility stat (count of COMPLETED journeys this user was the assigned VM for) — shown only when > 0. Add `GET /api/v1/users/:username/experience-logs` (this user's PUBLIC, published entries, paginated, guest-accessible). Populate the public profile with follow counts + status; resolve the requesting user (the endpoint currently ignores it).
- **Backend — Friends-tier unblock:** with mutual-follow now resolvable, `experience_log.view` FRIENDS becomes enforceable — a Friends entry is visible to viewers who mutually follow the author. (Closes the Item 22 deferral.)
- **Frontend:** Follow / Unfollow button on `/u/[username]` (auth-gated, optimistic), follower/following counts, the credibility stat, and the user's public experience entries list. Own-profile page shows follower/following counts. Presence indicators already render — verify against live data.

## Capabilities

### New Capabilities
- `follow-system`: one-way follow/unfollow endpoints (auth-required, self-follow rejected, idempotent), follower/following counts, mutual-follow ("friends") resolution, `NEW_FOLLOWER` notification.
- `public-profile-social`: public profile augmented with follow counts + the requester's follow status, the VM credibility stat, and a paginated list of the user's public experience entries (`GET /users/:username/experience-logs`).
- `follow-ui`: Follow/Unfollow button + follower/following counts + credibility stat + public experience entries on the public profile page; counts on own profile.

### Modified Capabilities
- `experience-log-crud`: the `experience_log.view` FRIENDS branch changes from fail-closed to mutual-follow-enforced (was deferred in Item 22). This is a spec-level behavior change to an existing capability.

## Impact

- **New backend module:** `apps/api/src/modules/follows/` (module, controller, service, repository). Uses the existing `UserFollow` table (no schema change). `NEW_FOLLOWER` notification via `NotificationsRepository`.
- **Users module:** `getPublicProfile` gains follow counts + status + credibility stat (via injected `FollowsService` or a repository count); new `GET /users/:username/experience-logs` (delegates to experience-logs/follows for the public list). The `:username` route adopts `OptionalSessionGuard` so the requester is resolved for follow status.
- **Permissions:** uses existing `follow.create` / `follow.remove` rows (already in spec/05 + `has-permission.ts`). Mutual-follow check added to `experience_log.view` — the permission function gains a `viewerFollowsAuthor`/`authorFollowsViewer` input on the experience-log resource, or the service resolves friendship and passes a derived boolean. (Design picks the cleaner of the two.)
- **Frontend:** `/u/[username]` page gains follow button + counts + credibility + experiences; `lib/api/follows.ts` (or extend `users.ts`) client + query keys.
- **No new dependencies. No schema migration** (`UserFollow` already exists).
- **Notifications:** `NEW_FOLLOWER` event type already in the enum — wire it to fire.
