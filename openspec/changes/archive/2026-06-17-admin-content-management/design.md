# Design: Admin content management

## Module layout

A single new `modules/admin/` module owns the privileged write surface for content. It is
the natural home because these endpoints share one authorization rule (admin-only) and one
cross-cutting concern (audit). It depends on existing modules' **services** (never their
repositories) where behavior must be reused, and on its own `AdminContentRepository` for the
straightforward CRUD that has no service-layer logic elsewhere.

```
modules/admin/
  admin.module.ts
  taxonomy.controller.ts      taxonomy.service.ts
  admin-shlokas.controller.ts admin-shlokas.service.ts
  admin-pothi.controller.ts   admin-pothi.service.ts
  admin-resources.controller.ts admin-resources.service.ts
  admin-content.repository.ts  (Prisma for all of the above)
  dto/
modules/cms/
  cms.module.ts cms.controller.ts cms.service.ts cms.repository.ts dto/
```

Featured curation lives in the existing `moderation` module (it is a moderator action,
`moderator.manage_display_content`), not in `admin`.

## Authorization

Two layers per route (CLAUDE.md hard rule):
1. **Guard** — `SessionGuard` for identity.
2. **Service ABAC** — `hasPermission(user, { type: 'admin' }, '<action>')` for each write.
   Existing permission cases cover every action: `admin.manage_taxonomy`,
   `admin.manage_shlokas`, `admin.manage_pothi`, `admin.manage_resources`,
   `admin.manage_content` (CMS), `moderator.manage_display_content` (featured). No new
   permission cases needed.

Per screen-spec, taxonomy/pothi/resources/shlokas/CMS are **admin-only**; featured curation
is admin-or-moderator. We rely on the permission function exactly as it already resolves.

## Audit

Every write is annotated with `@Audited({ action, resourceType, resourceIdParam | resourceId,
metadata })`, matching the moderation controller pattern. The `AuditInterceptor` is already
global. `action` strings follow spec/17 (e.g. `admin.create_shloka`, `admin.update_virtue`,
`admin.delete_resource`, `admin.upsert_cms_page`, `moderator.feature_blog`).

## Shloka index sync (ledger #23)

`admin-shlokas.service` calls the **already-exposed** seam on `ContentService`:
- after create/update → `contentService.syncShlokaToIndex(shloka)`
- after delete → `contentService.removeShlokaFromIndex(id)`

`AdminModule` imports `ContentModule` (which exports `ContentService`). Best-effort, never
throws (the seam already swallows index errors).

## Scheduling & queue

- **Schedule** — `ShlokaSchedule.scheduledDate` is `@unique @db.Date`. `PUT
  /admin/shlokas/schedule` upserts `{ scheduledDate, shlokaId }`; `DELETE
  /admin/shlokas/schedule/:date` removes it. Dates handled as UTC midnight `@db.Date`,
  matching `ContentService.getToday`.
- **Queue** — `ShlokaQueueItem.position` is `@unique`. Reorder is a **full-replacement in a
  transaction**: delete all queue items, re-insert in the supplied order with positions
  `0..n-1`. This avoids unique-collision gymnastics on partial reorders and matches the
  small-list reality (a curated playlist).

## Taxonomy delete safety

Deletes guard referential integrity in the service layer, returning a domain error
(`EntityInUseException`) rather than letting Prisma throw a raw FK violation:
- Virtue with subvirtues → blocked.
- Subvirtue with sentences or weakness links → blocked.
- Weakness referenced by any journey/exposure/resolution/challenge/test → blocked.
`WeaknessSubvirtue` link/unlink is always safe (join row).

## Pothi shloka assignments

`PothiSectionShloka` is an ordered join (`sortOrder`). Create/update a section takes a
`shlokaIds: string[]`; the service replaces the join rows in a transaction, assigning
`sortOrder` by array index. Section number is `@unique`.

## CmsPage model

```prisma
model CmsPage {
  id        String   @id @default(uuid()) @db.Uuid
  key       String   @unique          // e.g. "pothi-intro", "why-shlokas", "why-weaknesses"
  titleEn   String   @map("title_en")
  titleMr   String?  @map("title_mr")
  bodyEn    Json     @map("body_en")  // Tiptap JSON AST
  bodyMr    Json?    @map("body_mr")
  updatedById String? @map("updated_by_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("cms_pages")
}
```

Bodies are sanitized via the shared `sanitizeTiptapDoc` before persist (reuse
`common/tiptap/sanitize.ts`). Public read returns the doc as-is for the `MessageContent`
renderer. Unknown key → 404 (front-end shows the existing placeholder gracefully).

## Featured curation

`featured Boolean @default(false)` on `Blog` and `ExperienceLog`, indexed. The existing
public blog-list and experiences-list read paths add `featured` to their select and accept an
optional `?featured=true` filter so the web can render a featured rail/carousel. Setting it is
a moderator PATCH toggling the flag, `@Audited`.

## Frontend

- `(admin)/layout.tsx` → render children inside `AppLayoutClient` (shared shell), like the
  moderation fix. Pages additionally guard on `isAdmin` (redirect non-admins).
- New `lib/api/admin.ts` + `lib/api/cms.ts` domain clients; query-keys `admin.*`, `cms.*`.
- Dashboard at `/admin` with overview cards linking to each panel.
- Panels are client components using TanStack Query mutations; forms via React Hook Form +
  Zod (CLAUDE.md). Tiptap editors reuse the existing editor component used by blogs.
- Nav: add an `admin` group in `useNavGroups()` gated on `isAdmin`.
- Wire CMS reads: the three placeholder modals fetch `GET /cms-pages/:key` and render
  `MessageContent`, falling back to existing static copy when 404.

## i18n

All new strings added to `en.json` and `mr.json` at parity (`admin.*`, `cms.*`).

## Testing

- Auth matrix: one positive + one negative per new permission row (admin can / moderator &
  VA cannot create-virtue, schedule-shloka, upsert-cms, etc.; moderator can / VA cannot
  feature-blog).
- Service unit tests: taxonomy delete-safety, queue full-replace ordering, schedule upsert,
  pothi join replacement, CMS sanitize+upsert, index-sync seam called on shloka CRUD.
- Web: panels render; mutation wiring smoke tests consistent with existing web test depth.

## Non-goals (deferred onward)

- Resource OG-thumbnail auto-fetch (#20) — admin sets `thumbnailUrl` manually.
- Platform Stats dashboard (separate Item).
- Admin **user** management (#17, Item 31).
- Rich CMS versioning/preview — single live doc per key in v1.
