## Context

Item 25 assembles community blogs from existing primitives: `Blog`/`BlogComment` tables, `blog.*`/`comment.*`/`comment.moderate` permission rows, the shared `sanitizeTiptapDoc`, the MinIO upload pipeline, the Meilisearch `SearchModule` (Item 24), and the guest `(content)` route group (Item 22). Migration state is clean (verified `prisma migrate status`). No blogs module or web routes exist yet.

## Goals / Non-Goals

**Goals:**
- Blog CRUD (title + Tiptap body, draft→publish, author-scoped writes, guest-readable published, soft delete).
- Flat comments: create (auth), delete (author·blog-author·moderator), hide (blog-author·moderator; hidden visible to its author only), report (auth → notify moderators).
- A `blogs` Meilisearch index (title + plain-text body) reusing SearchModule; guest search endpoint.
- Get moderator permissions right the first time (`comment.delete`/`comment.hide` include moderators).
- Frontend list/detail/editor with four states, i18n, responsive, guest soft-prompt.

**Non-Goals:**
- **Moderator review dashboard / reported-comment queue UI** — that's Item 28; here, report only flags the comment + notifies moderators.
- **Comment threading** — flat in v1; `parentCommentId` added to schema for future use, not exposed.
- **Featured/curated blogs sidebar** — moderator display-content curation (Item 28/30).
- Bilingual title/body split — blogs are user-authored single-language (unlike curated content); plain string title.

## Decisions

### 1. Reuse the shared Tiptap sanitizer + add a plain-text extractor
Blog bodies use `sanitizeTiptapDoc` (same allowlist as chat/experience). For search indexing, add `tiptapToPlainText(doc)` to `common/tiptap/sanitize.ts` (walk the AST, concat text nodes). **Rationale:** one sanitizer + one extractor for all rich text; the index stores plain text, never the raw AST.

### 2. `blogs` Meilisearch index reusing SearchModule
Add `BlogsIndexService` (in the search module, alongside `UsersIndexService`) owning the `blogs` index: searchable `title` + `bodyText`, filterable nothing needed (only published blogs are ever indexed — drafts/deleted are removed). Sync on publish (upsert), edit-while-published (upsert), unpublish/delete (remove). `GET /blogs/search?q=` returns hydrated published blogs by relevance. Best-effort sync (failures logged, never thrown) — same posture as users. **Rationale:** exercises the multi-index design the stack was built for (Item 24); blog list stays a DB cursor query, search is the index.

### 3. Comment authorization — moderators included
`comment.delete`: allow when `comment.authorId === user.id` OR `blog.authorId === user.id` OR `hasPermission(user, {type:'platform'}, 'comment.moderate')`. `comment.hide`: blog author OR moderator. The permission function gains these branches (it already imports `isAdminOrModerator`). **Rationale:** spec/16 ("Moderators can delete or hide any comment") + spec/05 Layer 2 — a lesson from Items 22/23 where moderator/relationship paths were initially missed. Get it right in the matrix, with positive+negative tests per row.

### 4. Hidden vs deleted comments (spec/16)
Hidden: `isHidden=true` + `hiddenById`. Hidden comments are excluded from the public list but **returned to their own author** (marked hidden) — so the read query includes a comment when `!isHidden OR authorId === viewer`. Deleted: soft-delete (`deletedAt`) — gone for everyone. **Rationale:** matches spec exactly; the read logic is the only subtlety.

### 5. Report flags + notifies, queue is Item 28
`report` sets `reportedAt` (idempotent — first report wins) and fires `COMMENT_REPORTED` to all moderators/admins (new `findModeratorIds()` repo method). No report table or dedupe-per-reporter in v1 (a single flag is enough to surface it to the queue Item 28 builds). **Rationale:** right-sized; spec/17's dashboard is a later item.

### 6. Guest access via `(content)` + OptionalSessionGuard
Blog list + detail are guest-readable (spec/27): list/detail endpoints use `OptionalSessionGuard`; the pages live under the `(content)` route group (Item 22). Comment create/delete/hide/report + blog write use `SessionGuard`. Route ordering: `GET /blogs/search` declared before `GET /blogs/:id`. **Rationale:** established patterns; guests read, members write.

### 7. Draft model mirrors experience logs
Create → `isDraft=true`. Publish via PATCH `isDraft:false` sets `publishedAt` and triggers index upsert. Only the author sees their drafts (list `?mine=true` or a dedicated own-list). Published blogs are always public (no tiers — spec/16). **Rationale:** consistency with Item 22's experience-log draft model.

## Risks / Trade-offs

- **[Moderator path missed]** → Explicitly designed in (decision 3) with positive+negative auth-matrix tests, having learned from Items 22/23.
- **[Index/DB divergence]** → Only published, non-deleted blogs are indexed; every publish/edit/unpublish/delete syncs; best-effort with logged failures. Blog list reads the DB (authoritative), so a stale index only affects search ranking, not correctness.
- **[Hidden-comment leak]** → The read query must include `authorId === viewer` for hidden comments; covered by a test (hidden comment absent for others, present-and-marked for its author).
- **[Plain-text extraction cost]** → Done once at write time (on publish/edit), not per search; bounded by body size.
- **[Report spam]** → `reportedAt` is set-once; repeated reports are no-ops. Full dedupe/queue is Item 28.
- **[Schema drift]** → Verify `migrate status` clean before generating (done); additive nullable columns only.

## Migration Plan

Additive migration `add_blog_comment_threading_and_report`: `BlogComment.parentCommentId` (nullable, self-FK or plain uuid) + `BlogComment.reportedAt` (nullable). Apply to dev (5433) + test (5434); regenerate client; verify both columns present + existing blog/comment tests green. Then: backend (CRUD → comments → index) → tests → frontend → verify end-to-end with Meili live.
