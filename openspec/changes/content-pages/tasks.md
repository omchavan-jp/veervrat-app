## 1. Preflight

- [x] 1.1 Verify `prisma migrate status` clean (drift guard) — DONE: clean; no schema changes

## 2. Backend — shlokas index

- [x] 2.1 `ShlokasIndexService` (search module): ensureIndex (searchable devanagari/transliteration/meaningEn/meaningMr/looseTags), upsert/remove, search→ids; best-effort; register in SearchModule
- [x] 2.2 Boot seed of existing shlokas (in content module onModuleInit)

## 3. Backend — content module

- [x] 3.1 Scaffold `apps/api/src/modules/content/` (module, controllers pothi/shlokas/resources, service, repository, dto) + register in app.module
- [x] 3.2 Repository: pothi sections (+ordered shlokas +resource links), shlokas list (source substring filter, cursor), shloka detail (+formal tags resolved to entity names +loose +resources), shloka-of-the-day (schedule→queue), resources list (type filter, cursor), resource detail (+tags resolved), tag-name resolver (virtue/subvirtue/weakness/sentence)
- [x] 3.3 Service: getPothiSections, getShlokas, searchShlokas (≥2 chars, hydrate index ids, degrade empty), getShloka (404), getToday, getResources, getResource (404)
- [x] 3.4 Controllers: pothi (`GET /pothi/sections`), shlokas (`GET /shlokas`, `/shlokas/search`, `/shlokas/today`, `/shlokas/:id` — search+today before :id), resources (`GET /resources`, `/resources/:id`) — all OptionalSessionGuard

## 4. Backend — tests

- [x] 4.1 Content service spec: pothi list; shlokas list+source filter; shloka detail resolves formal tags + 404; today (schedule priority → queue → null); resources list+type filter + 404; search <2 empty + degrade
- [x] 4.2 ShlokasIndexService spec: upsert/search delegate; sync failure swallowed

## 5. Frontend

- [x] 5.1 `lib/api/content.ts` (pothi/shlokas/resources) + query keys
- [x] 5.2 `(content)/pothi` page (sectioned, BilingualText, "What is the Pothi?" modal, links to shlokas/resources, four states)
- [x] 5.3 `(content)/shlokas` page (search + source filter + cards → Shloka Detail modal w/ formal+loose tags + linked resources + "Why we study shlokas" modal)
- [x] 5.4 `(content)/resources` page (type filter + cards + detail w/ MessageContent description)
- [x] 5.5 Nav entries (Pothi, Shlokas, Resources — likely a "Library"/content group); i18n en+mr at parity

## 6. Verification

- [x] 6.1 API + web typecheck clean; both production builds pass
- [x] 6.2 Full API suite green; web tests green
- [x] 6.3 Backend probe (temp-seed sample shloka/pothi/resource): pothi sections; shlokas list/detail (tags resolved)/search hit; today (schedule then queue); resources list/detail; 404s; clean up seed after
- [x] 6.4 Rendered-UI: pothi, shlokas (search→detail modal), resources; bilingual; four states (incl. empty); mobile+desktop; console clean
- [x] 6.5 Update Deferral Ledger (resource OG-thumbnail fetch; admin CRUD = Item 30; philosophy/Pothi modal CMS copy = Item 30; coming-soon source sections); record in change notes


## Notes

- **Verified end-to-end (temp-seeded shloka/pothi/resource, cleaned after):** pothi sections (+linked shloka), shlokas list/detail (formal tags resolved, loose tags), search (Meili — "skill"→Gita 2.50), shloka-of-the-day (schedule priority → queue), resources list/detail, 404s. Browser: /pothi (section + shloka), /shlokas (search + detail modal w/ tags), /resources (type filter + card), guest (content) shell, Devanagari-primary, no console errors.
- **Reused (per lessons):** SearchModule (third index `shlokas`), guest (content) shell, BilingualText, MessageContent (resource description), useDebounce, OptionalSessionGuard + route ordering (search/today before :id). No schema changes, no new deps. Probe-seed var-capture gotcha: psql `-A -c "...RETURNING id"` appends "INSERT 0 1" — capture ids with a follow-up SELECT instead.
- **Deferral Ledger updated** (#20 resource OG-thumbnail; #21 philosophy/Pothi modal CMS copy; #22 coming-soon source sections; #23 shloka index sync into admin CRUD) — all → Item 30 / future. Admin CRUD for all three = Item 30.
