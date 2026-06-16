## 1. Data model

- [x] 1.1 Verify `prisma migrate status` clean (drift guard) — DONE: clean
- [x] 1.2 Add `BlogComment.parentCommentId` (nullable) + `BlogComment.reportedAt` (nullable) to schema
- [x] 1.3 Migration `add_blog_comment_threading_and_report`; apply dev (5433) + test (5434); regenerate client; confirm both columns present

## 2. Backend — shared bits

- [x] 2.1 Add `tiptapToPlainText(doc)` to `common/tiptap/sanitize.ts` (+ unit test)
- [x] 2.2 Add `blog` to `UploadPurpose` + `POST /uploads/blog` controller route
- [x] 2.3 Permission: `comment.delete` (author·blog-author·moderator) + `comment.hide` (blog-author·moderator) — widen with `comment.moderate`; update has-permission.spec with positive+negative per row
- [x] 2.4 Users/notifications: `findModeratorIds()` repo method for report notifications

## 3. Backend — blogs module

- [x] 3.1 Scaffold `apps/api/src/modules/blogs/` (module, controller, service, repository, dto) + register in app.module
- [x] 3.2 DTOs: create (title, body), update (title?, body?, isDraft?), createComment (body)
- [x] 3.3 Repository: blog create/update/softDelete/findPublishedList(cursor)/findByIdPublished/findOwn; comment create/softDelete/hide/markReported/listForBlog(viewer-aware hidden); findModeratorIds
- [x] 3.4 Service: blog CRUD (sanitize body, author checks via hasPermission, publish sets publishedAt + index upsert); comments (create, delete/hide/report with permission + moderator path, hidden-comment read rule); report → notify moderators
- [x] 3.5 Controller: blogs CRUD (`GET` list/detail + `/search` via OptionalSessionGuard, before `:id`; write via SessionGuard); comments routes; `{ data }` envelope, cursor pagination

## 4. Backend — search

- [x] 4.1 `BlogsIndexService` (search module): ensureIndex (searchable title+bodyText), upsert/remove, search→ids; best-effort
- [x] 4.2 Wire sync: publish/edit-while-published → upsert; unpublish/delete → remove; startup seed of published blogs
- [x] 4.3 `GET /blogs/search?q=` (≥2 chars, guest-ok, degrade-empty)

## 5. Backend — tests

- [x] 5.1 Blogs service spec: create draft, publish (index upsert + publishedAt), edit/delete author-only, guest list excludes drafts, draft not readable by others, empty-body 400
- [x] 5.2 Comments service spec: create; delete by author/blog-author/moderator (positive) + unrelated (negative); hide by blog-author/moderator; hidden visible to its author only; report flags + notifies + idempotent
- [x] 5.3 BlogsIndexService spec: upsert/search delegate; only published indexed; sync failure swallowed; tiptapToPlainText extracts text
- [x] 5.4 has-permission.spec: comment.delete/hide moderator positive + unrelated negative

## 6. Frontend

- [x] 6.1 `lib/api/blogs.ts` (CRUD, list, detail, search, comments: create/delete/hide/report) + query keys
- [x] 6.2 Blog list page `(content)/community/blogs` (paginated, guest-ok, four states) + search box
- [x] 6.3 Blog detail `(content)/community/blogs/[id]` (body render via message-content/Tiptap, flat comments, comment box for authed / soft prompt for guest, hide/delete/report controls by permission)
- [x] 6.4 Blog editor `(app)/blogs/new` + `/blogs/[id]/edit` (reuse experience editor Tiptap foundation: title+body+image, draft/publish)
- [x] 6.5 Entry points (nav "Community"/"Blogs" + "Write a blog"); i18n en+mr at parity

## 7. Verification

- [x] 7.1 API + web typecheck clean; both production builds pass
- [x] 7.2 Full API suite green; web tests green
- [x] 7.3 Backend probe (Meili live): create→publish→list→detail; search hit; draft hidden from others + search; comment create/hide(author-visible)/delete-by-moderator/report→moderator notification; guest read OK, guest comment 401
- [x] 7.4 Rendered-UI: list→detail→comment; editor write+image+publish; guest soft-prompt; hide/delete/report controls; four states; mobile+desktop; console clean
- [x] 7.5 Record deferrals (moderator review queue = Item 28; threading; featured-blogs curation)


## Notes

- **Verified end-to-end (Meili live):** create→publish→list→detail; search "consistency" (body-only word) → hit; draft excluded from list+search; comment create; guest comment 401; blog-author hide → guest sees 0, comment author still sees it marked hidden; report → comment_reported notification to moderator; moderator delete on a non-owned blog → 200. Browser: editor (title gates save), publish→detail, comment with author hide/delete controls, list + search, no console errors, (content) guest shell.
- **Permission fix:** the pre-existing has-permission.spec wrongly asserted "blog author cannot delete another user's comment" — corrected to match spec/16 + the Item-25 directive ("own comment or blog author or moderator"). Moderator delete/hide paths added (learned from Items 22/23 moderator/relationship gaps).
- **Reused stacks (per earlier lessons):** Meilisearch SearchModule (Item 24) → second `blogs` index; shared sanitizeTiptapDoc + new tiptapToPlainText; guest `(content)` route group (Item 22); OptionalSessionGuard + route ordering. No new deps.
- **Deferred (recorded):** moderator review/reported-comment queue UI = Item 28; comment threading (parentCommentId reserved, flat in v1); featured/curated blogs sidebar = Item 28/30.
