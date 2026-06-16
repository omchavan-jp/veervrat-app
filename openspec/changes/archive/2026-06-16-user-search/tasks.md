## 1. Data model

- [x] 1.1 Add nullable `reminderSentAt` to `Invitation` (DONE: migration `20260615121159_add_invitation_reminder_sent_at`, applied dev+test, client regenerated)
- [x] 1.2 (drift fix, DONE) Restore `Journey.completionSubmittedAt` to schema.prisma (was missing → bad migration tried to drop it); confirm journeys/actions tests green

## 2. Infra — Meilisearch

- [x] 2.1 Update `documentation/10_Platform-Engineering-Standard.md`: add `meilisearch` SDK package + index-sync conventions (sync-after-commit, best-effort, no PII in index)
- [x] 2.2 Install `meilisearch` SDK; add `MEILI_HOST` + `MEILI_MASTER_KEY` to config validation (Joi) + `.env.example`
- [x] 2.3 `SearchModule` (global) + `MeiliService`: client from config, `health()`, `index(uid)`, no-op/warn when unconfigured (mirror UploadsService); `waitForTask` helper for tests

## 3. Backend — users index + search

- [x] 3.1 `UsersIndexService`: `ensureIndex()` (searchable username/displayName, filterable isPublic; NO email), `upsert(user)`, `remove(id)`, `search(query, requesterId)` (filter isPublic=true, exclude self, limit 10)
- [x] 3.2 Boot: ensureIndex + idempotent seed of existing users (bounded)
- [x] 3.3 Wire sync: users service fires `upsert` after create/profile-update/visibility-update (post-commit, best-effort)
- [x] 3.4 Users service `searchUsers(user, q)`: ≥2 chars else empty; exact-email branch via DB `findByEmail` (never indexed) prepended; map to DTO with presence (honor showLastActive/showOnlineIndicator) + follow status (FollowsService); graceful empty on Meili down
- [x] 3.5 Users controller `GET /users/search?q=` under SessionGuard, declared before `:username`

## 4. Backend — invitations completion

- [x] 4.1 Repo `create`: expiry by type (PLATFORM 30d, VM 7d); add `markReminderSent`
- [x] 4.2 Service: PLATFORM branch in send (no scope, any authed user, platform email template); `sendReminder(user, id)` (inviter-only, PENDING, reminderSentAt null → re-send + stamp); `shareMessage` generation (localized) on send + list
- [x] 4.3 DTO allows `PLATFORM`; platform-invite email template in EmailModule
- [x] 4.4 Controller `POST /invitations/:id/reminder`

## 5. Backend — tests

- [x] 5.1 Users search service spec: exact-email branch, private/self excluded, <2 chars empty, Meili-down → empty (mock UsersIndexService)
- [x] 5.2 UsersIndexService spec: upsert/search delegate to client; sync failure swallowed (client rejects → no throw); email absent from indexed doc
- [x] 5.3 Invitations service spec: platform 30d vs VM 7d; reminder once then rejected; non-inviter/non-pending rejected; shareMessage present

## 6. Frontend — API client + invite flow

- [x] 6.1 `lib/api/users.ts` `searchUsers(q)`; extend `lib/api/invitations.ts` (send VM+platform, sendReminder, cancel, list); query keys
- [x] 6.2 Invitation flow component: debounced search box, result rows (name/username/presence/follow), select → scope (Global VM / journey / platform) → send; four states
- [x] 6.3 Pending Invitations section: status badges, Send reminder (once), Cancel, copyable+editable shareable message
- [x] 6.4 Wire entry points (My Vratmitras "Invite" + journey settings); reachable screen
- [x] 6.5 i18n en+mr at parity

## 7. Verification

- [x] 7.1 API + web typecheck clean; both production builds pass
- [x] 7.2 Full API suite green; web tests green
- [x] 7.3 Backend probe (Meili running): index a user → search fuzzy hit; exact-email; private-excluded; self-excluded; <2 empty; stop Meili → search empty (write still ok); platform invite 30d; reminder once then 4xx; non-inviter 403
- [x] 7.4 Rendered-UI: search→select→scope→send; pending list status/resend(once)/cancel/copy; four states; mobile+desktop; console clean
- [x] 7.5 Record deferrals (other indices = items 25/29 on this stack; v2 search filters; expiry/auto-cancel edge cases = lifecycle/Item 34)


## Notes

- **DECISION (course-corrected):** went with **Meilisearch** (spec/07 + PES), not pg_trgm. Bilingual Marathi/English needs language-aware tokenization; it's the spec'd engine; already provisioned; reused by items 25/29. Stood up the shared SearchModule/MeiliService/UsersIndexService stack.
- **Drift repair (pre-existing, fixed):** schema.prisma was missing `Journey.completionSubmittedAt` (Item 21) though migration/DBs/client/code had it — the next migrate would have DROPPED it. Restored. Separately noted: Item 21's migration had also dropped Item 20's pg_trgm entity-search GIN indexes (raw-SQL, never in schema) — entity-search still works (seq scans), indexes can be re-added later; moot for user search (now Meili).
- **Verified end-to-end (Meili live):** fuzzy + typo ("veervart"→veervrat), exact-email, self-excluded, <2-empty; platform invite 30d + shareMessage; reminder once→200 then 409; UI search→select→scope→send→pending list→reminder(disables)→share/copy; mobile reflow; no console errors.
- **Deferred (recorded):** other Meili indices (weaknesses/sentences/shlokas/blogs/experience-logs/resources) land with their features on this stack (items 25/29); v2 search filters (spec/13); invite expiry/auto-cancel edge cases (B/D) = lifecycle/Item 34; graceful-degradation covered by unit tests (not probed live to avoid disrupting the shared container).
