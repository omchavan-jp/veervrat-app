# Proposal: Admin content management

## Why

Item 30 of `documentation/03_Implementation-Order.md`. The read side of all platform
content (virtues taxonomy, shlokas, Pothi, resources) ships through Items 26 and 29, but
there is **no way to author or maintain any of it** — the only path today is direct SQL or
the seed script. Admins need management panels.

This item also pays back several Deferral-Ledger rows that were explicitly routed here:
- **#19** — Shloka management / scheduling / queue, Pothi/resource admin CRUD.
- **#23** — Shloka index sync wired into admin shloka CRUD (the seam is already exposed:
  `ContentService.syncShlokaToIndex/removeShlokaFromIndex`).
- **#18** (recurring) — `@Audited` annotations on the admin/content actions built here.
- **#12** — Featured-content curation (blogs sidebar, experiences carousel).
- **#13 / #21** — Admin-managed CMS copy ("Why study weaknesses?", "What is the Pothi?",
  virtue/weakness explanatory content) — currently hard-coded/placeholder shells.

## What changes

### Backend (NestJS) — all admin-only, all `@Audited`
- **New `admin` module** housing the write surface for content. Reuses existing repositories'
  models; new admin controllers/services/repositories under `modules/admin/`.
- **Taxonomy CRUD** — `POST/PATCH/DELETE /admin/virtues`, `/admin/subvirtues`,
  `/admin/weaknesses`, plus `/admin/weakness-subvirtues` link/unlink (with priority).
- **Shloka management** — `POST/PATCH/DELETE /admin/shlokas` (formal + loose tags), wired to
  the index-sync seam; `PATCH /admin/shlokas/schedule` (assign a shloka to a date) and
  `DELETE /admin/shlokas/schedule/:date`; `GET/PATCH /admin/shlokas/queue` (reorder/add/remove).
- **Pothi section CRUD** — `POST/PATCH/DELETE /admin/pothi/sections` with ordered shloka
  assignments.
- **Resource CRUD** — `POST/PATCH/DELETE /admin/resources` (admin sets `thumbnailUrl`
  manually, per ledger #20).
- **CMS pages** — new `CmsPage` model (`key` unique, bilingual title + Tiptap body);
  `POST/PATCH/DELETE /admin/cms-pages` (admin) + public `GET /cms-pages/:key` (guest read).
- **Featured curation** — `featured` boolean on `Blog` and `ExperienceLog`;
  `PATCH /moderation/blogs/:id/featured` and `/moderation/experiences/:id/featured`
  (`moderator.manage_display_content`); featured surfaced on the existing read endpoints.

### Database
- Migration: add `Blog.featured`, `ExperienceLog.featured` (default false, indexed).
- Migration: add `CmsPage` model.

### Frontend (Next.js) — new `(admin)` route group, admin-only nav
- Admin dashboard (`/admin`) with overview cards (Taxonomy, Shlokas, Pothi, Resources, CMS,
  Featured).
- Management panels: taxonomy, shlokas (+ scheduling/queue), pothi, resources, cms, featured.
- `(admin)/layout.tsx` switched to render inside `AppLayoutClient` (shared shell), mirroring
  the moderation-layout fix.
- Nav: an **Admin** group, visible only to admins.
- Wire the CMS read side into the existing placeholder modals (Pothi "What is the Pothi?",
  shlokas "Why we study shlokas", weaknesses "Why study weaknesses?").

## Impact

- New `modules/admin/` (controllers/services/repositories/dto), new `modules/cms/`.
- Touches: `content` module (no change to reads), `blogs` + `experience-logs` read paths
  (surface `featured`), `moderation` controller (featured curation), `schema.prisma`
  (2 migrations), web `(admin)` group + nav + 3 content modals.
- No new runtime dependencies.
