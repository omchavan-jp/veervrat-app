## 1. Shared sanitizer refactor

- [x] 1.1 Move `chats/tiptap-content.ts` → `common/tiptap/sanitize.ts` as `sanitizeTiptapDoc` + `InvalidTiptapContentError` (behavior-preserving; keep allowlist incl. entityAt/entityHash)
- [x] 1.2 Update chats module imports to the shared sanitizer; run chat suite to confirm no regression

## 2. Permissions

- [x] 2.1 Extend `ExperienceLogSlim` with `visibility` + `isDraft`; update `experience_log.view` to allow PUBLIC non-draft for anyone, keep FRIENDS fail-closed, drafts author-only (reference spec/14 + spec/05)
- [x] 2.2 Auth-matrix tests for the new view branches (public visible; only-me hidden; friends hidden pre-follow; VM sees journey-tagged)

## 3. Backend — experience-logs module

- [x] 3.1 Scaffold `apps/api/src/modules/experience-logs/` (module, controller, service, repository, dto) + register in app.module
- [x] 3.2 DTOs: create (body, journeyId?, tags[]), update (body?, visibility?, isDraft?, tags?) — class-validator
- [x] 3.3 Repository: create with tags (tx), update (replace tags tx), softDelete, findOwnList (cursor), findById (with tags + author + journey), findPublicPool (cursor, PUBLIC+!draft+!deleted)
- [x] 3.4 Service: create (force draft/only_me, sanitize body, journey-ownership check via permission), update/publish (author check, re-sanitize), delete (author check), getMine, getOne (visibility-enforced via hasPermission), getPublicPool
- [x] 3.5 Controller: POST/PATCH/DELETE/GET (own) under SessionGuard; GET /public guest-accessible (no guard); `{ data }` envelope, cursor pagination

## 4. Backend — uploads

- [x] 4.1 Add `POST /uploads/experience` (controller) + service path parameterized by purpose (reuse MinIO + HEIC pipeline); upload record tagged purpose

## 5. Backend — tests

- [x] 5.1 Service spec: create (draft forced), publish (visibility applied), edit/delete author-only, journey-ownership negative, sanitize-empty negative
- [x] 5.2 Public pool: excludes only-me/friends/draft/deleted; included when public
- [x] 5.3 Uploads experience path: type/size negative, HEIC→jpg

## 6. Frontend — API client + editor

- [x] 6.1 `lib/api/experience-logs.ts` (create/update/delete/getMine/getOne/getPublic) + `lib/api/uploads.ts` experience method + query keys
- [x] 6.2 Experience editor component (reuse chat composer Tiptap foundation): rich text, image upload, entity tag selector, draft save, visibility selector on publish
- [x] 6.3 Editor route(s): global `/experiences/new` + edit `/experiences/[id]/edit`; journey-scoped entry pre-tagged (from journey overview)

## 7. Frontend — lists + entry points

- [x] 7.1 "My Experiences" list page (drafts+published, excerpt/date/visibility/tag badges, edit/delete, four states)
- [x] 7.2 Public experience pool page (guest-accessible, paginated, author links, four states)
- [x] 7.3 Enable dashboard "Log your experience" CTA → editor; add "Log experience" entry on journey Status Overview; sidebar nav entries (My Experiences / public pool as appropriate)
- [x] 7.4 i18n keys for all new strings in en.json + mr.json at parity

## 8. Verification

- [x] 8.1 API + web typecheck clean; both production builds pass
- [x] 8.2 Full API suite green (incl. unchanged chat tests after sanitizer move); new web tests green
- [x] 8.3 Backend probe: create→publish→public-pool visibility incl. negative (only-me/friends hidden, draft hidden); upload negative cases
- [x] 8.4 Rendered-UI: editor (write/image/tag/draft/publish), my-list, public pool, dashboard CTA, journey entry — four states, mobile+desktop, console clean
- [x] 8.5 Record deferrals explicitly (Friends-tier follow enforcement → Item 23; Meilisearch index; entity backlinks on entity pages; moderator sidebar curation)


## Notes

- **Deferred (recorded):** Friends-tier enforcement for third-party viewers depends on the mutual-follow system (Item 23) — stored + selectable now, fail-closed until then. Meilisearch indexing of experience logs deferred with all indices. Entity backlinks on entity detail pages land with those pages. Moderator sidebar curation of featured public entries = moderation UI (Item 28/30).
- Public pool lives in a new guest-accessible `(content)` route group (not `(app)` which is auth-gated, nor `(public)` which redirects members away). The virtues/pothi/shlokas browsers (items 26/29) will join this group.
- Verified end-to-end in browser: create→publish(PUBLIC)→my-list→public pool; guest fetch of pool (credentials omitted) returns 200; only-me/draft hidden from guests (404, no leak); mobile reflow OK.
