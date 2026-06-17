# Tasks: Admin content management

## 1. Schema & migrations
- [x] 1.1 Add `featured Boolean @default(false)` (+ `@@index`) to `Blog` and `ExperienceLog`
- [x] 1.2 Add `CmsPage` model (key unique, bilingual title + Tiptap bodies, updatedById)
- [x] 1.3 `prisma migrate dev` (dev), apply to test DB, regen client; verify `migrate status` clean

## 2. Backend — admin module (taxonomy)
- [x] 2.1 `modules/admin/` scaffold + `AdminModule` (imports ContentModule, AuthModule)
- [x] 2.2 Taxonomy DTOs + controller + service + repository (virtues/subvirtues/weaknesses/links)
- [x] 2.3 Delete-safety guards (EntityInUseException) in service
- [x] 2.4 `@Audited` on every write; `hasPermission(admin.manage_taxonomy)` checks

## 3. Backend — shlokas + scheduling + queue
- [x] 3.1 Shloka CRUD DTOs/controller/service/repository (formal + loose tags)
- [x] 3.2 Index-sync seam calls (`ContentService.syncShlokaToIndex/removeShlokaFromIndex`)
- [x] 3.3 Schedule upsert/delete by date; queue get/replace (transactional)
- [x] 3.4 `@Audited` + `admin.manage_shlokas` checks

## 4. Backend — pothi + resources
- [x] 4.1 Pothi section CRUD with ordered shloka join replacement (transactional)
- [x] 4.2 Resource CRUD (file/link, tags, thumbnailUrl manual)
- [x] 4.3 `@Audited` + `admin.manage_pothi` / `admin.manage_resources` checks

## 5. Backend — CMS pages
- [x] 5.1 `modules/cms/` — public `GET /cms-pages/:key` (OptionalSessionGuard)
- [x] 5.2 Admin CRUD `/admin/cms-pages` with Tiptap sanitize, `admin.manage_content`, `@Audited`

## 6. Backend — featured curation
- [x] 6.1 Featured PATCH endpoints in moderation (blogs + experiences), `moderator.manage_display_content`, `@Audited`
- [x] 6.2 Surface `featured` + `?featured=true` filter on public blogs + experiences reads

## 7. Tests (alongside)
- [x] 7.1 Auth matrix: positive+negative per new permission row
- [x] 7.2 Service unit tests: delete-safety, queue replace order, schedule upsert, pothi join replace, cms sanitize, index-sync seam invoked, featured toggle
- [x] 7.3 Fix any spec mocks broken by new constructor deps; full API suite green

## 8. Frontend — admin group
- [x] 8.1 `(admin)/layout.tsx` → AppLayoutClient shell; admin-only page guard
- [x] 8.2 `lib/api/admin.ts` + `lib/api/cms.ts` + query-keys; nav `admin` group gated on isAdmin
- [x] 8.3 Dashboard `/admin` overview cards
- [x] 8.4 Panels: taxonomy, shlokas (+ scheduling/queue), pothi, resources, cms, featured
- [x] 8.5 Wire CMS reads into the 3 placeholder modals (pothi/shlokas/weaknesses)
- [x] 8.6 i18n en/mr parity; web tests; both prod builds pass

## 9. Verification gate & close-out
- [x] 9.1 API + web typecheck clean; both prod builds; full suites green
- [x] 9.2 Backend probe (positive + 403 + 404) via curl/psql; browser rendered-UI verify; console clean
- [x] 9.3 Cleanup all test data + Meili docs
- [x] 9.4 `openspec validate` + `archive`; update Deferral Ledger (#12,#13,#18,#19,#20,#21,#23) + memory
- [x] 9.5 Merge `feat/admin-content` → dev (squash)

## Deferrals recorded
- Resource OG-thumbnail auto-fetch remains ledger #20 (admin sets thumbnailUrl manually).
- Platform Stats dashboard and Admin user management are separate items (not this change).
