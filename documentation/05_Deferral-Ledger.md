# Deferral Ledger

Single source of truth for work **intentionally deferred** during implementation — so
nothing is silently dropped (Implementation-Cautions §12) and so the item that "pays back"
a deferral knows what's owed.

**How to use:** when you defer something, add a row here (don't only bury it in a change's
`tasks.md`). When you implement an item, scan the "Paid back by" column for your item number
and clear those rows (strike through + mark ✅ Done with the date).

Status: ⬜ Open · ✅ Done · 🔁 Recurring (re-evaluate each relevant item)

| # | Deferral | Deferred in | Paid back by | Status |
|---|---|---|---|---|
| 1 | Friends-tier experience-log visibility enforced via mutual follow | Item 22 | Item 23 | ✅ Done (Item 23) |
| 2 | Meilisearch stood up as the shared search stack | Item 20 note / Item 22 | Item 24 | ✅ Done (Item 24) |
| 3 | Experience-log Meilisearch index | Item 22 | Item 24+ (stack exists; index TBD) | ⬜ Open |
| 4 | Entity backlinks on entity detail pages (experience tags surfaced on the tagged entity) | Item 22 | When entity detail pages mature (26 partial / future) | ⬜ Open |
| 5 | Full `/my-vratarthis` two-panel VM page (only VM Guidance built) | Item 21 | Future VM-side item (spec/22 §1) | ⬜ Open |
| 6 | Follow feed / activity stream | Item 23 (spec/10 defers to v2) | v2 | ⬜ Open (v2) |
| 7 | v2 user-search filters ("has acted as VM", location) | Item 24 (spec/13 → v2) | v2 | ⬜ Open (v2) |
| 8 | Invite expiry / auto-cancel edge cases (B/D in spec/13) | Item 24 | Item 34 (dormant/expiry jobs) + lifecycle | ⬜ Open |
| 9 | pg_trgm entity-search GIN indexes dropped by Item 21 migration (entity-search runs on seq scans) | Found Item 24 | Re-add indexes, or migrate entity-search to Meili, when its perf matters | ⬜ Open |
| 10 | Blog comment threading (`parentCommentId` reserved, flat in v1) | Item 25 (spec/16) | Future | ⬜ Open |
| 11 | Reported-comments moderation panel/queue UI | Items 25 & 28 | Item 28-adjacent / a moderation follow-up | ⬜ Open |
| 12 | Featured-content curation (blogs sidebar, experiences carousel) | Items 22/25/28 (spec/16,17) | Item 30 (admin/display content) | ⬜ Open |
| 13 | "Why study weaknesses?" + virtue/weakness CMS content (admin-managed) | Item 26 (spec/21) | Item 30 | ⬜ Open |
| 14 | Sentence-info "Take a test / Choose a weakness" deep CTA wiring (currently links to /study) | Item 26 | When the weakness-selection-from-sentence flow is built | ⬜ Open |
| 15 | Custom-ERC duplicate detection / side-by-side comparison | Item 28 (spec/27) | Future moderation polish | ⬜ Open |
| 16 | Moderator "save edits without deciding" draft action | Item 28 (spec/27) | Future moderation polish | ⬜ Open |
| 17 | Admin audit dashboard UI (backend `GET /admin/audit-events` exists) | Item 27 | Item 31 (admin user management) | ⬜ Open |
| 18 | `@Audited` annotations on admin/content actions (most spec/17 mandatory events) | Item 27 | Items 30 & 31 (annotate as built) | 🔁 Recurring |
| 19 | Shloka management / scheduling / queue, Pothi/resources admin CRUD | Item 28 | Item 30 (read side done by Item 29) | ⬜ Open |
| 20 | Resource OG-thumbnail auto-fetch for links (chat-link-preview/integrations system) | Item 29 | When link-preview/integrations built; admin sets thumbnailUrl meanwhile (Item 30) | ⬜ Open |
| 21 | "Why we study shlokas" / "What is the Pothi?" modal CMS copy (placeholder shells shipped) | Item 29 | Item 30 (admin display content) | ⬜ Open |
| 22 | "Coming soon" shloka source sections (Stotras/Upanishads/etc. placeholders) | Item 29 (spec/27) | Future content expansion | ⬜ Open |
| 23 | Shlokas index sync wired into admin shloka CRUD (seam exposed: ContentService.syncShlokaToIndex/removeShlokaFromIndex) | Item 29 | Item 30 | ⬜ Open |

## Notes
- Each deferral is also recorded in its originating change's archived `tasks.md` (`openspec/changes/archive/`) — this table is the cross-item index, not a replacement.
- "v2" rows are explicitly out of v1 scope per their spec decision; listed so they aren't mistaken for gaps.
