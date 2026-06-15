## Context

Item 22 builds the experience-logging feature on scaffolding that already exists:
- **Schema:** `ExperienceLog` (authorId, nullable journeyId, Tiptap `body` jsonb, `visibility` enum ONLY_ME/FRIENDS/PUBLIC, `isDraft`, `publishedAt`, soft-delete) and `ExperienceLogTag` (entityType, entityId) are migrated.
- **Permissions:** `experience_log.create/view/edit/delete` rows (spec/05) + resource type `{ type:'experience_log'; journey; log }` + `ExperienceLogSlim` are implemented in `has-permission.ts`.
- **Sanitizer:** `chats/tiptap-content.ts` validates/sanitizes Tiptap JSON (node/mark allowlist, URL validation) — chat-specific naming.
- **Uploads:** `uploads.service.ts` stores images in MinIO with HEIC→JPEG conversion; `POST /uploads/chat` is the existing entry.

What's missing is the module wiring, the visibility-tier read enforcement, the public pool, and the editor/list/pool UI.

## Goals / Non-Goals

**Goals:**
- Full CRUD for global and journey-scoped experience logs with Tiptap bodies, draft→publish, entity tags, image upload.
- Server-side structural sanitization of every body before write (shared sanitizer).
- Visibility-tier-aware reads: Only-me (author only), Public (anyone incl. guest), plus VM access to journey-tagged entries (spec/14).
- Guest-accessible paginated public pool.
- Editor, personal list, and public pool UI — all four states, responsive, i18n; dashboard + journey-overview entry points wired.

**Non-Goals:**
- **Friends-tier third-party enforcement** — requires the mutual-follow system (Item 23). The tier is stored and selectable; until follows exist, a Friends entry is treated as private to non-author/non-VM viewers (fail-closed). Recorded as a deferral.
- **Meilisearch indexing** of experience logs — Meilisearch isn't wired yet (deferred with all indices).
- **Moderator sidebar curation** of featured public entries — that's the moderation display-content UI (Item 28/30); out of scope here.
- **Entity backlinks** rendering on each entity's detail page (spec/14 "entry appears on that entity's page") — the tags are stored and queryable; surfacing backlinks on entity pages lands with those pages. Recorded.

## Decisions

### 1. Shared Tiptap sanitizer in `common/tiptap/`
Move `sanitizeChatContent` + the allowlist out of the chats module into `common/tiptap/sanitize.ts` as `sanitizeTiptapDoc` (+ a generic `InvalidTiptapContentError`). Chat keeps a thin re-export (or imports the shared fn) so its behavior and tests are unchanged. Experience logs use the same function. **Rationale:** the Cautions doc warns against partial/duplicated rules; one allowlist for all rich text is the single source of truth. Alternative (duplicate the sanitizer per module) rejected — drift risk.

### 2. Visibility enforcement lives in the service, via the permission function
`experience_log.view` currently handles owner + journey-VM. Extend it to also allow PUBLIC entries for anyone (including guests/no-VA) and keep FRIENDS fail-closed for now. To do this the permission resource's `ExperienceLogSlim` gains `visibility` and `isDraft`. Drafts are viewable only by the author regardless of tier. **Rationale:** authorization stays centralized in `has-permission.ts` (CLAUDE.md hard rule) rather than ad-hoc checks in the service.

### 3. Public pool is a separate endpoint, not a filter on the list
`GET /experience-logs` returns the caller's own entries (drafts + published). `GET /experience-logs/public` returns everyone's PUBLIC, non-draft, non-deleted entries, paginated, guest-accessible (no SessionGuard). **Rationale:** different auth posture (one is "mine", one is "the world's public"), different default filters; conflating them invites accidental leakage. Matches the screen-spec split (personal list vs public pool).

### 4. Draft model: visibility forced to ONLY_ME until publish
On create, `isDraft=true`, `visibility=ONLY_ME`, `publishedAt=null` regardless of input. Publish is a PATCH that sets `isDraft=false`, `publishedAt=now()`, and applies the chosen visibility. Post-publish, visibility is editable via PATCH and takes effect immediately. **Rationale:** spec/14 "Drafts are always Only me until published"; downgrade has no notification (just immediate effect).

### 5. Journey-scoped entries reuse the same module/endpoint
A journey-scoped entry is just an experience log with `journeyId` set (and typically a JOURNEY tag). The create endpoint accepts an optional `journeyId`; the permission check requires journey ownership when present. No separate endpoint. **Rationale:** spec/14 — "same editor as global, but pre-tagged"; the only difference is a pre-filled journey context.

### 6. Tags written transactionally with the log
Create/edit replace the tag set in the same Prisma transaction as the body write (delete-all + create for edit). Tag `entityType` validated against `TagEntityType`; `entityId` is a UUID. **Rationale:** keeps tags consistent with the entry; avoids orphaned tags.

### 7. Image upload reuses the existing pipeline, parameterized by purpose
Add `POST /uploads/experience` that calls the same upload service with a `purpose` discriminator (chat vs experience) for the stored upload record. Validation (≤10MB, image types, HEIC→JPEG, ≤5 enforced client-side per entry) is identical. **Rationale:** one upload path, audited; no second S3 client.

## Risks / Trade-offs

- **[Friends tier silently private]** → Until Item 23, a Friends entry is invisible to everyone but author/VM. This is fail-closed (never over-shares) and explicitly recorded; the UI still lets the author pick Friends so no rework when follows land. The `view` permission gets a TODO-free, spec-referenced branch that simply returns false for FRIENDS by non-author/non-VM.
- **[Public pool leakage]** → The pool endpoint must filter `visibility=PUBLIC AND isDraft=false AND deletedAt IS NULL` at the repository, never trust client filters. Covered by a test asserting a non-public/draft entry never appears.
- **[Sanitizer refactor regresses chat]** → Move is behavior-preserving; run the full chat suite after. The shared fn keeps the identical allowlist incl. `entityAt`/`entityHash`.
- **[Body size / unbounded content]** → spec/14: no character limit for v1. Sanitizer still bounds structure (allowlisted nodes only); images bounded by upload limits. Acceptable.
- **[Guest endpoint + rate limiting]** → public pool is unauthenticated; relies on the global unauthenticated throttler (60/min/IP) already in AppModule. No per-route override needed.

## Migration Plan

No schema migration — `ExperienceLog`/`ExperienceLogTag` already exist. If `ExperienceLogSlim` needs `visibility`/`isDraft` for the permission check, that's a type-only change (no DB). Ship backend → tests → frontend → wire entry points. No rollback complexity (additive endpoints).
