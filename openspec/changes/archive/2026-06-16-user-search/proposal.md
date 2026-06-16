## Why

Vratarthis need to find people — to invite a Vratmitra, invite someone to the platform, or discover users — but there is no user search and the invitation backend only covers VM invitations (no platform invites, no reminders, no shareable message). Item 24 adds user search and completes the invitation system, then wires the full invitation UI flow (search → select → scope → send; pending list with status, resend, cancel) that the My Vratmitras page links to.

## What Changes

- **Backend — user search:** `GET /api/v1/users/search?q=` (auth-required) — fuzzy match on username + display name, exact match on full email, excluding private profiles and the requester. Implemented with **Meilisearch** (spec/07 + Platform Engineering Standard) — this item stands up the shared search stack: a Meili client provider + health check, a `users` index, sync on user create/update, and `is_public` filtering. Results include presence (last active / online, honoring privacy) and the requester's follow status.
- **Backend — invitations completion:** add **platform invitations** (`InvitationType.PLATFORM`, 30-day expiry, signup link) alongside the existing VM invitations (7-day); add **send-reminder** (one allowed per invitation, tracked via a new `reminderSentAt`); add an **auto-generated shareable message** (VA name + app + invite link) returned with the invitation for copy/paste sharing. Correct per-type expiry (platform 30d vs VM 7d).
- **Backend — schema:** additive `reminderSentAt` on `Invitation`. (No user trigram indexes — search lives in Meilisearch.)
- **Infrastructure:** wire Meilisearch (already in docker-compose) into the app: install the `meilisearch` SDK, a `SearchModule` with a Meili client provider + config + health check, and a `users` index synced on user create/update with `is_public` as a filterable attribute. This is the foundation later indices (blogs Item 25, shlokas/resources Item 29) reuse.
- **Frontend — invitation UI flow:** user search box (debounced), result rows (name, username, presence, follow status), select → choose scope (Global VM / this journey / platform invite) → confirm/send. Pending Invitations section: status badges (pending/accepted/declined/expired), "Send reminder" (one allowed), "Cancel", and a copyable shareable message. Entry points from My Vratmitras and journey settings.

## Capabilities

### New Capabilities
- `search-infrastructure`: a `SearchModule` wiring the Meilisearch client (config, health check) and the index-sync primitive — the shared stack later indices reuse.
- `user-search`: `GET /api/v1/users/search?q=` — auth-required fuzzy (username/displayName) + exact-email search, excludes private profiles and self, returns presence + follow status. Backed by a Meilisearch `users` index synced on user create/update.
- `platform-invitations`: platform-invite support (`PLATFORM` type, 30-day expiry, signup-link email + shareable message) in the existing invitations module.
- `invitation-reminders`: one-reminder-per-invitation send-reminder endpoint, tracked via `reminderSentAt`; re-sends the invite email.
- `invitation-ui`: frontend search → select → scope → send flow, pending-invitations list with status/resend/cancel and a copyable shareable message.

### Modified Capabilities
<!-- The existing VM-invitation send/accept/decline/cancel endpoints keep their contracts; platform invites + reminders are additive. The users search endpoint is new. No spec-level requirement of an existing capability changes. -->

## Impact

- **New module:** `apps/api/src/modules/search/` — `SearchModule` (global), `MeiliService` (client + config + health + index helpers), `UsersIndexService` (index/sync/search of the `users` index). Cross-module: other modules call `MeiliService`/index services, never the Meili client directly.
- **Backend:** `users` module gains `searchUsers` (delegates to the users index) + `GET /users/search` route (declared before `:username`), and fires index sync on user create/update. `invitations` module gains platform-invite branch, `sendReminder`, shareable-message generation. `EmailModule` reused for platform-invite email.
- **Schema:** additive migration — `Invitation.reminderSentAt` (nullable). No user trigram indexes.
- **Dependencies:** **new** — `meilisearch` (official JS SDK). Requires a `documentation/10_Platform-Engineering-Standard.md` update first (already lists Meilisearch as the search engine; add the SDK package + the index-sync conventions). Config: `MEILI_HOST`, `MEILI_MASTER_KEY` env (docker-compose already runs it on the configured port).
- **Permissions:** search is any authenticated user (no new row); `vm_invitation.send` governs VM invites; platform invite is any authenticated user (spec/13).
- **Resilience:** index sync is best-effort/eventually-consistent (fire-after-commit); a Meili outage must not break user writes (sync failures are logged, not fatal). Local dev: if Meili isn't running, search degrades gracefully (empty results + a warning), mirroring how uploads handle missing MinIO.
