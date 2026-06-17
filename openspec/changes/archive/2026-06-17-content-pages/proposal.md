## Why

Veervrat's cultural reference surfaces — the **Pothi** (ceremonial booklet), the **Shlokas** library, and the **Resources** collection — are three distinct, guest-accessible content areas (spec/19, spec/adr/0007). All the data models exist (`Shloka`, `PothiSection`, `Resource`, schedules/queue, tag joins) but there are no read endpoints or pages, and the content is admin-managed (created in Item 30). Item 29 builds the read APIs + pages that render this content for guests and members, plus the shloka-of-the-day and a Meilisearch `shlokas` index (reusing the Item-24 SearchModule).

## What Changes

- **Backend — content read endpoints (guest-accessible, OptionalSessionGuard):** `GET /api/v1/pothi/sections` (sections with their ordered shlokas + resource links), `GET /api/v1/shlokas` (paginated; optional source filter), `GET /api/v1/shlokas/search?q=` (Meili), `GET /api/v1/shlokas/:id` (detail — text/translation/source + formal tags resolved to entity names + loose tags + linked resources), `GET /api/v1/shlokas/today` (shloka-of-the-day: scheduled date → else queue auto-advance), `GET /api/v1/resources` (paginated; optional type filter), `GET /api/v1/resources/:id` (detail).
- **Backend — shlokas Meili index:** a `shlokas` index on the shared SearchModule (searchable devanagari/transliteration/meaning + loose tags), synced on shloka create/update/delete (the sync hooks are called by Item 30's admin CRUD; Item 29 provides the index service + a startup seed of existing shlokas).
- **Frontend — three content pages (`(content)` group, guest-accessible):** Pothi page (sectioned, Devanagari-primary, "What is the Pothi?" + "See more shlokas"/Resources links), Shlokas library (searchable grid + source filter + Shloka Detail modal with formal/loose tags + "Why we study shlokas" modal), Resources page (filterable list + detail). Nav entries.

## Capabilities

### New Capabilities
- `content-read-api`: guest-accessible Pothi sections, shlokas (list/search/detail/today), and resources (list/detail) read endpoints; shloka-of-the-day scheduling+queue logic; formal tags resolved to entity names.
- `shlokas-search-index`: a `shlokas` Meilisearch index on the shared SearchModule (sync + search), with a startup seed.
- `content-pages-ui`: Pothi, Shlokas library (+ detail modal + philosophy modals), and Resources pages — guest-accessible, bilingual, four states, responsive.

### Modified Capabilities
- `search-infrastructure`: add a third index (`shlokas`) — additive, exercises the multi-index design; no behavior change to users/blogs indices.

## Impact

- **New backend module:** `apps/api/src/modules/content/` (module, controller(s), service, repository, dto) covering pothi/shlokas/resources reads. New `ShlokasIndexService` in the search module reusing `MeiliService`.
- **Sync seam for Item 30:** `ShlokasIndexService.upsert/remove` exported so Item 30's admin shloka CRUD keeps the index current; Item 29 seeds existing shlokas at boot.
- **Frontend:** new routes under `(content)` — `/pothi`, `/shlokas`, `/resources` (+ detail/modals); `lib/api/content.ts` client + query keys; nav entries. Reuse `BilingualText`, `MessageContent` (resource rich-text description), `(content)` shell, `useDebounce`.
- **Permissions:** all read-only + guest-accessible (spec/09, spec/19). No new rows.
- **Schema:** none (all models exist; `migrate status` clean). **No new dependencies** (Meili already wired).
- **Deferred (recorded → Deferral Ledger):** resource OG-thumbnail auto-fetch for links (the chat-link-preview/integrations system — not built; admin supplies thumbnailUrl in Item 30); admin CRUD for all three (Item 30); "coming soon" shloka source sections (Stotras/Upanishads/etc. — placeholders per spec/27). The philosophy/Pothi modals render placeholder copy until admin CMS (Item 30) supplies content.
