## Context

Item 24 needs user search + a complete invitation flow. Existing state: the invitations module handles VM invitations (send/accept/decline/cancel/list) with 7-day expiry and email; the public-profile/follow systems (Item 23) provide presence + follow status. Meilisearch is in docker-compose (v1.41.0, master key configured) but unwired — no SDK, client, or sync. spec/07 + the Platform Engineering Standard designate Meilisearch as *the* platform search engine across nine indices (users, weaknesses, sentences, shlokas, blogs, experience-logs, resources…). The `Invitation` model has no reminder tracking; there is no platform-invite path.

## Goals / Non-Goals

**Goals:**
- Stand up the shared **Meilisearch** stack (client provider, config, health, index-sync primitive) — the foundation Items 25/29 reuse.
- `GET /users/search?q=` — fuzzy username/displayName, exact full-email, exclude private profiles + self, presence + follow status, auth-required, backed by a Meili `users` index synced on user create/update.
- Platform invitations (30-day) + correct per-type expiry; one-reminder-per-invite; auto-generated shareable message.
- Invitation UI: search → select → scope → send; pending list with status, resend (one), cancel, copyable message.
- Graceful degradation when Meili is down (writes still succeed; search returns empty + warns).

**Non-Goals:**
- Indexing other entities now (weaknesses/sentences/shlokas/blogs/experience-logs/resources) — only the `users` index is built here; the rest land with their features (25/29) on this same stack.
- A reindex/backfill CLI for existing users beyond a simple idempotent sync-on-write + a one-shot seed of current users at startup (recorded).
- v2 search filters ("has acted as VM", location) — spec/13 defers to v2.
- The non-platform-invitee pre-filled signup flow's *signup-side* context surfacing — the invite carries context and the accept page already exists (Item 14); deep pre-fill polish is out of scope here (recorded if any gap).
- Notification on VM-invite *expiry* and the auto-cancel edge cases (B/D) — those belong to the dormant/expiry background job (Item 34) and lifecycle; not re-implemented here.

## Decisions

### 1. Meilisearch as the platform search engine (spec/07 + PES)
Stand up Meilisearch now rather than defer. **Rationale:** (a) it's the spec'd engine across nine indices, and Item 24 is the first real search feature — the natural place to build the shared stack; (b) the app is **bilingual Marathi/English** — Meilisearch has language-aware Unicode tokenization, materially better than `pg_trgm`'s byte-level trigrams on Devanagari (decisive for sentence/shloka search in later items, marginal-but-correct for names here); (c) it's already provisioned in docker-compose, so the cost is the client + sync, not infra; (d) building pg_trgm now would be ripped out for Items 25/29. The earlier "pg_trgm now" instinct optimized for short-term effort over the spec'd architecture — corrected.

Architecture: a global `SearchModule` exposes `MeiliService` (typed client from config, `health()`, `index(uid)` helper, `waitForTask` in tests). `UsersIndexService` owns the `users` index: `ensureIndex()` (settings: searchable `username`/`displayName`, filterable `isPublic`, no email in the index — see decision 2), `upsert(user)`, `remove(userId)`, and `search(query, requesterId)`. The users module calls `UsersIndexService`, never the raw client.

### 2. Email is matched by exact DB lookup, NOT indexed in Meili (privacy)
Email is **never** put in the search index (privacy: emails must not be fuzzy-discoverable or dumpable from the index). Exact-email search is a separate strongly-consistent `users.findByEmail` DB query, run only when `q` is a full valid email; its hit is merged ahead of Meili name results. The Meili `users` index holds only id, username, displayName, isPublic, and presence fields. **Rationale:** matches spec/13 (exact full-email only) and keeps PII out of the search store.

### 3. Ranking + filtering
Meilisearch returns relevance-ranked results natively (typo-tolerant, prefix). Apply `filter: isPublic = true` always (private profiles never surface — spec/10), and exclude the requester client-side from the returned page (or via a filter on id). Exact-email hit (decision 2) is prepended. Cap to 10. The spec/13 open question ("exact first, then fuzzy by score") is satisfied: exact email/username first, then Meili relevance.

### 3a. Sync: fire-after-commit, best-effort, with a startup seed
On user create/update (profile/visibility changes), the users module calls `UsersIndexService.upsert` after the DB write — not in the same transaction (Meili isn't transactional). Failures are logged, never thrown (a search-store hiccup must not fail a profile save). On app boot, `UsersIndexService.ensureIndex()` runs and a lightweight idempotent seed upserts existing users (bounded; fine at current scale) so search works without a manual reindex. If `MEILI_HOST` is unset/unreachable, the service no-ops with a warning and `search` returns empty — mirroring how `UploadsService` degrades without MinIO.

### 4. Platform invites reuse the invitations module with per-type expiry
Add a `PLATFORM` branch to the send path: 30-day expiry (vs VM 7-day), a signup-link email, no scope, any authenticated user. Expiry becomes a function of `type` in the repository's `create` (currently hardcoded to VM days). **Rationale:** one invitation table + flow; type drives expiry and email template.

### 5. One reminder per invitation via `reminderSentAt`
Additive nullable `reminderSentAt` on `Invitation`. `POST /invitations/:id/reminder` (inviter-only, PENDING only, `reminderSentAt IS NULL`) re-sends the email and stamps the field; a second attempt is rejected. **Rationale:** spec/13 "Send reminder (one allowed)". Minimal honest representation (a timestamp), matching the existing nullable-timestamp idiom.

### 6. Shareable message generated server-side, editable client-side
The send response (and list rows) include a `shareMessage` string (VA display name + app name + accept/signup URL), localized. The client shows it copyable and editable before sharing (spec/13: auto-generated, VA can edit). **Rationale:** the URL + token live server-side; generating the message there keeps the link authoritative.

### 7. Search route ordering
`GET /users/search` is declared before `GET /:username` (and `:username/experience-logs`) so "search" is never swallowed as a username param — same discipline already used for `check-username` and the experience `public` route.

## Risks / Trade-offs

- **[Email enumeration via search]** → Exact-email only (no partial, never indexed); a non-match returns empty — same info a signup "email taken" check already exposes. Private profiles filtered out. Acceptable for an auth-required search.
- **[Eventual consistency]** → A just-created/renamed user may not appear in search for a moment (sync is post-commit). Acceptable for discovery; the exact-email path is strongly consistent so direct invites by email always work.
- **[Meili outage breaks writes]** → Mitigated: sync is best-effort and never thrown from the write path; search degrades to empty + warning. Verified by a unit test where the index client rejects.
- **[Index/DB divergence]** → `ensureIndex` + startup seed + sync-on-write keep them aligned; presence fields (lastActive/online) drift between syncs but are re-fetched authoritatively from the DB when rendering a profile (search results show approximate presence — acceptable).
- **[New dependency]** → `meilisearch` SDK added; PES already designates Meilisearch, so this records the concrete package + conventions (no architectural surprise).
- **[Reminder spam]** → Hard one-reminder cap via `reminderSentAt`; second call 4xx.
- **[Self / already-VM in results]** → Self excluded; "already your VM / already invited" surfaced by the UI from relationship/invite state, not by hiding from search.

## Migration Plan

Additive DB migration: `Invitation.reminderSentAt` (nullable) only — applied to dev (5433) + test (5434). No trigram indexes. Meilisearch needs no DB migration; `ensureIndex` runs at boot. Sequence: PES doc update (SDK + conventions) → install `meilisearch` → SearchModule + UsersIndexService → users search route + sync wiring → invitations completion → tests → frontend. Rollback: the feature degrades to empty search if Meili is removed; the `reminderSentAt` column is nullable and harmless.
