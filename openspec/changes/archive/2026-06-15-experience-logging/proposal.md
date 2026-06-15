## Why

Vratarthis need a place to write free-form reflections on their growth — both globally (not tied to a journey) and in the context of a specific journey. This is the personal-reflection counterpart to community blogs (spec/14): raw, untitled, entity-taggable, with three visibility tiers. The data model (`ExperienceLog`, `ExperienceLogTag`), permission rows, Tiptap sanitizer, and MinIO upload pipeline already exist from earlier items — what's missing is the module that ties them together and the editor/list/pool UI. The dashboard already renders a (currently disabled) "Log your experience" CTA waiting on this.

## What Changes

- **Backend:** New `experience-logs` module — `POST /api/v1/experience-logs` (create, Tiptap JSON body, draft model, optional journey context, optional entity tags), `PATCH /api/v1/experience-logs/:id` (edit body/visibility/tags, publish a draft), `DELETE /api/v1/experience-logs/:id` (soft delete), `GET /api/v1/experience-logs` (own list: drafts + published), `GET /api/v1/experience-logs/:id` (single entry, visibility-enforced), `GET /api/v1/experience-logs/public` (paginated public pool, guest-accessible). Rich-text body structurally sanitized server-side before write.
- **Backend (shared):** Generalize the existing chat Tiptap sanitizer into a shared `common/tiptap/` module so chat and experience logs use one allowlist-based sanitizer (no duplication).
- **Backend (uploads):** Add `POST /api/v1/uploads/experience` for experience-log images (reuses the existing MinIO upload + HEIC→JPEG path; max 5 × 10MB images).
- **Frontend:** Experience log editor (Tiptap — reuses the chat composer's editor foundation), draft save model, visibility selector (Only me / Friends / Public — set on publish), entity tag selector, image upload. Personal "My Experiences" list (drafts + published, edit/delete). Public experience pool page (guest-browseable, paginated). Journey-scoped "Log experience" entry from the journey Status Overview (pre-tagged to that journey). Enable the dashboard "Log your experience" CTA.

## Capabilities

### New Capabilities
- `experience-log-crud`: Create/edit/soft-delete/read experience logs (global + journey-scoped) with Tiptap JSON bodies, draft→publish model, visibility tiers, and entity tags. Server-side sanitization + permission enforcement scoped per spec/05.
- `experience-log-public-pool`: `GET /api/v1/experience-logs/public` — paginated, guest-accessible list of entries marked Public, with author and tags.
- `experience-log-image-upload`: `POST /api/v1/uploads/experience` — image upload for experience-log bodies (≤5 × 10MB), stored in MinIO via the existing pipeline.
- `experience-log-editor`: Frontend Tiptap editor page (global + journey-scoped) with draft save, visibility selector, entity tag selector, image upload, all four UI states.
- `experience-log-list`: Frontend personal "My Experiences" list (drafts + published) with excerpt, date, visibility/tag badges, edit/delete; and the public pool page.

### Modified Capabilities
<!-- Tiptap sanitizer is refactored to a shared module, but its observable behavior (allowlist, URL validation) is unchanged — an implementation move, not a spec-level change. No existing capability's requirements change. -->

## Impact

- **New backend module:** `apps/api/src/modules/experience-logs/` (module, controller, service, repository, dto). Cross-module reads (journey ownership for journey-scoped entries, VM scoping for view) go through services/the permission function, never foreign repositories.
- **Refactor:** `apps/api/src/modules/chats/tiptap-content.ts` → `apps/api/src/common/tiptap/sanitize.ts` (shared); chat imports updated. Behavior preserved; chat tests stay green.
- **Uploads:** extend `uploads.service.ts` / `uploads.controller.ts` with an experience-image path (parameterized by purpose; same validation + HEIC conversion).
- **Frontend:** new routes — `apps/web/app/(app)/experiences/` (editor, my-list), public pool page; journey overview gains a "Log experience" entry; `lib/api/experience-logs.ts` client + query keys. Enable dashboard CTA.
- **Permissions:** exercises existing rows `experience_log.create/view/edit/delete` (already in spec/05 + permission helper). Visibility-tier viewing extends the `experience_log.view` case to honor Only-me/Public now; **Friends tier resolution is deferred** to the follow system (Item 23) and recorded — stored but not yet enforced for third-party viewers.
- **Search index:** experience logs are a Meilisearch index target (PES), but Meilisearch isn't wired yet — index sync deferred with the other indices (recorded, consistent with items 7/22/24/25 notes).
- **No new dependencies.** No schema changes (tables already exist).
