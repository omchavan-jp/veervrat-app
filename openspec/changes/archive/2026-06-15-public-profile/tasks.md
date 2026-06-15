## 1. Backend — follows module

- [x] 1.1 Scaffold `apps/api/src/modules/follows/` (module, controller, service, repository) + register in app.module
- [x] 1.2 Repository: follow (upsert), unfollow (delete), exists, countFollowers, countFollowing, areMutualFollows, getStatus(viewerId, targetId) → {isFollowing, followsYou}
- [x] 1.3 Service: follow (resolve username→id via UsersService, reject self-follow, idempotent, fire NEW_FOLLOWER only on new edge), unfollow (idempotent), expose counts/status/mutual helpers; permission via hasPermission follow.create/remove
- [x] 1.4 Controller: `POST/DELETE /users/:username/follow` under SessionGuard; `{ data }` envelope

## 2. Backend — public profile augmentation

- [x] 2.1 Users repo: add credibility stat (count JourneyVmAssignment where vmId=user AND journey COMPLETED) to findByUsername
- [x] 2.2 Users service getPublicProfile: thread requesting user → follower/following counts + isFollowing/followsYou (via FollowsService); add credibility when >0; DTO updated
- [x] 2.3 `:username` route → OptionalSessionGuard (resolve requester for guests + members)
- [x] 2.4 `GET /users/:username/experience-logs` (OptionalSessionGuard, guest-ok) → ExperienceLogsService.getPublicByAuthor (new repo method findPublicByAuthor, cursor)

## 3. Backend — Friends-tier enforcement (Item 22 unblock)

- [x] 3.1 Add optional `viewerIsFriend` to the experience_log permission resource; `experience_log.view` allows FRIENDS when true
- [x] 3.2 experience-logs service getOne: resolve mutual-follow via FollowsService and pass viewerIsFriend (only when not author/not public/not VM)
- [x] 3.3 Update has-permission.spec experience_log.view: mutual-follower sees FRIENDS (positive), non-mutual hidden (negative)

## 4. Backend — tests

- [x] 4.1 Follows service spec: follow/unfollow idempotent, self-follow rejected, NEW_FOLLOWER fires once, mutual detection
- [x] 4.2 Users service spec: profile includes counts + status + credibility(>0 only); private 404
- [x] 4.3 experience-logs service spec: FRIENDS visible to mutual follower, hidden otherwise; getPublicByAuthor excludes non-public/draft

## 5. Frontend

- [x] 5.1 `lib/api/follows.ts` (follow/unfollow) + extend users public-profile type with counts/status/credibility + `getPublicExperiences(username)`; query keys
- [x] 5.2 `/u/[username]`: Follow/Unfollow button (auth-gated, optimistic, hidden on own profile, guest → login prompt), follower/following counts, credibility stat, public experience entries list
- [x] 5.3 Own profile page: follower/following counts
- [x] 5.4 i18n keys (follow/following/unfollow, followers, following, guided-journeys, publicExperiences, loginToFollow) en+mr at parity

## 6. Verification

- [x] 6.1 API + web typecheck clean; both production builds pass
- [x] 6.2 Full API suite green (incl. updated permission + experience-log specs); web tests green
- [x] 6.3 Backend probe: follow→profile shows isFollowing+count; NEW_FOLLOWER notification row; mutual follow → FRIENDS entry visible, one-way → hidden; self-follow 400; guest follow 401
- [x] 6.4 Rendered-UI: follow/unfollow optimistic on /u/[username], counts, credibility, public experiences; own profile counts; guest prompt; mobile+desktop; console clean
- [x] 6.5 Record any deferral (follow feed/activity stream = future, per spec/10)


## Notes

- **Deferred (recorded):** follow feed / activity stream — spec/10 explicitly defers to a future version. Meilisearch-backed user search = Item 24.
- Closes the Item 22 deferral: Friends-tier experience-log visibility is now enforced via mutual follow. Verified end-to-end incl. retroactive loss (break mutual → 404).
- Users↔Follows and Users↔ExperienceLogs module cycles broken with forwardRef; app boots clean.
- Verified in browser: follow→Following + count increments, own profile hides button + shows following count, no console errors; backend probe: NEW_FOLLOWER fired once, idempotent re-follow, self-follow 400, guest 403/401.
