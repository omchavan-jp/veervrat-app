## Why

The community blog system (spec/16, spec/27) lets any VA or VM write, publish, and discuss long-form posts — the main community-content surface. The data model (`Blog`, `BlogComment`), permission rows (`blog.*`, `comment.*`, `comment.moderate`), the shared Tiptap sanitizer (Item 22), the MinIO upload pipeline (Item 22), the Meilisearch stack (Item 24), and the guest-accessible `(content)` route group (Item 22) all already exist — Item 25 assembles them into the blog feature.

## What Changes

- **Backend — blogs CRUD:** `POST /api/v1/blogs` (create — title + Tiptap JSON body, draft model), `PATCH /api/v1/blogs/:id` (edit own, re-sanitize), `DELETE /api/v1/blogs/:id` (soft delete own), `GET /api/v1/blogs` (published list, cursor-paginated, guest-accessible), `GET /api/v1/blogs/:id` (single published blog + its visible comments, guest-accessible). Body sanitized via the shared `sanitizeTiptapDoc`.
- **Backend — comments:** `POST /api/v1/blogs/:id/comments` (auth, plain-text body), `DELETE /api/v1/blogs/:id/comments/:cid` (own comment, blog author, OR moderator), `POST /api/v1/blogs/:id/comments/:cid/hide` (blog author OR moderator — hidden from public but visible to its author), `POST /api/v1/blogs/:id/comments/:cid/report` (auth — flags for moderator review, notifies moderators). Flat (no threading) in v1.
- **Backend — search index:** a `blogs` Meilisearch index (reusing the Item-24 `SearchModule`) synced on publish/edit/delete, with `GET /api/v1/blogs/search?q=` (published blogs only). Title + plain-text body searchable.
- **Backend — permissions correctness:** extend `comment.delete` and `comment.hide` so a **moderator** (via `comment.moderate`) can act on any comment — not only the author / blog author (spec/16 + spec/05 Layer 2).
- **Backend — schema:** additive — `BlogComment.parentCommentId` (nullable, for future threading per spec/16), `BlogComment.reportedAt` (nullable, flags a comment for the moderator queue), and a Tiptap → plain-text extractor for search indexing.
- **Frontend:** blog list (`(content)/community/blogs`, guest-accessible, paginated), blog detail (`/community/blogs/[id]` — body + flat comments, comment box for authed users, soft auth-prompt for guests, author/mod hide/delete + report), blog editor (`(app)/blogs/new` + `/blogs/[id]/edit` — Tiptap title+body+image, draft/publish), "My blogs" affordance, and entry points (nav + "Write a blog").

## Capabilities

### New Capabilities
- `blog-crud`: create/edit/soft-delete/list/read blogs (title + Tiptap body, draft→publish, author-scoped mutations, guest-readable published).
- `blog-comments`: flat comments with create / delete (author·blog-author·moderator) / hide (blog-author·moderator) / report (any authed → moderator notification); hidden comments visible only to their author.
- `blog-search`: a Meilisearch `blogs` index (title + plain-text body) synced on publish/edit/delete, with a guest-accessible search endpoint.
- `blog-ui`: blog list, detail+comments, and editor screens with the four states, i18n, responsive.

### Modified Capabilities
- `search-infrastructure`: add a second index (`blogs`) on the existing SearchModule — exercises the stack's multi-index design (additive; no behavior change to the users index).

## Impact

- **New backend module:** `apps/api/src/modules/blogs/` (module, controller, service, repository, dto). New `BlogsIndexService` in the search module (or blogs module) reusing `MeiliService`. Cross-module: uses `UploadsService` (images), `NotificationsService` (report → moderators), `MeiliService`; no foreign repositories.
- **Schema:** additive migration — `BlogComment.parentCommentId` + `BlogComment.reportedAt`. (Verify schema/DB/client consistency first — drift lesson from Item 24.)
- **Permissions:** `comment.delete`/`comment.hide` widened to include moderators; `blog.*`/`comment.*` already in spec/05 + `has-permission.ts`. Auth-matrix tests for each row incl. the moderator path.
- **Shared sanitizer:** reuse `common/tiptap/sanitize.ts`; add a plain-text extractor there for search indexing.
- **Uploads:** add a `blog` purpose to the existing `uploadImage` (mirrors `experience`).
- **Frontend:** new routes under `(content)` (guest list/detail) + `(app)` (editor); `lib/api/blogs.ts` client + query keys; nav entry. Reuse the experience editor's Tiptap foundation.
- **No new dependencies.** Meilisearch + Tiptap + MinIO already wired.
