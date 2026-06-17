## Context

Pothi/Shlokas/Resources are three distinct guest-accessible content areas (spec/19). All models exist (`Shloka`+`ShlokaTag`+`PothiSection`+`PothiSectionShloka`+`Resource`+`ResourceTag`+`ShlokaSchedule`+`ShlokaQueueItem`); none are seeded (content is admin-managed, Item 30). The shared Meili SearchModule (Item 24, with users + blogs indices), the guest `(content)` route group (Item 22), `BilingualText`, `MessageContent`, and `useDebounce` all exist. Schema is clean.

## Goals / Non-Goals

**Goals:**
- Guest-accessible reads: Pothi sections (+shlokas+resource links), shlokas (list/search/detail/today), resources (list/detail). Formal tags resolved to entity names; loose tags passthrough.
- Shloka-of-the-day: scheduled-date priority → queue auto-advance fallback.
- A `shlokas` Meili index (search + sync seam for Item 30) with startup seed.
- Three pages + shloka detail modal + the two philosophy modals (placeholder copy), bilingual, four states.

**Non-Goals:**
- Admin CRUD for any of the three — Item 30 (this item only reads + provides the index sync seam).
- Resource OG-thumbnail auto-fetch — the link-preview/integrations system isn't built; resources render whatever `thumbnailUrl` admin sets (Item 30). Recorded.
- Real philosophy/Pothi modal copy — admin-managed CMS (Item 30); ship modal shells with placeholder text.
- "Coming soon" shloka source sections (Stotras/Upanishads/…) — static placeholders per spec/27.

## Decisions

### 1. One `content` module covering all three reads
A single `content` module (controllers for pothi/shlokas/resources, one service, one repository) — they're closely related read surfaces sharing tag-resolution logic. **Rationale:** avoids three thin modules; matches "content pages" as one feature. Controllers split by path (`pothi`, `shlokas`, `resources`) for clean routing; `shlokas/search` declared before `shlokas/:id`, `shlokas/today` before `:id` too.

### 2. `shlokas` Meili index reusing SearchModule
`ShlokasIndexService` (like Users/Blogs): searchable `devanagariText`/`transliteration`/`meaningEn`/`meaningMr` + `looseTags`, filterable `source` (parsed from sourceCitation? — no; keep source as a returned field, filter client/DB-side for v1 since sourceCitation is free-text). Sync `upsert/remove` exported for Item 30; `onModuleInit` seeds existing shlokas. Search degrades to empty when Meili down. **Rationale:** consistent with Item 24/25; the third index proves the stack generalizes. Source filtering stays a DB concern (sourceCitation is unstructured) — `GET /shlokas?source=` does a substring match; Meili handles fuzzy text search.

### 3. Shloka-of-the-day: schedule → queue
`GET /shlokas/today`: (a) look up `ShlokaSchedule` where `scheduledDate = today` (date-only) → return that shloka; (b) else pick from `ShlokaQueueItem` ordered by position, advancing by day so it rotates (`position = dayOfEpoch % queueLength`); (c) else return null (empty state). `new Date()` is fine in a request handler (not a workflow script). **Rationale:** spec/16 + spec/19 (scheduled dates take priority; queue auto-advances).

### 4. Formal tags resolved to entity names in the detail response
A shloka's `ShlokaTag` rows carry `entityType`+`entityId`. The detail endpoint resolves each to a display name (virtue/subvirtue/weakness/sentence) so the frontend can render clickable chips without N lookups. Loose tags are returned as-is. Same for resources. **Rationale:** spec/19 "formal tags shown as structured chips linked to entities"; resolve server-side to keep the client simple.

### 5. Guest-accessible; pages in `(content)`
All endpoints `OptionalSessionGuard`; pages join the `(content)` group (Item 22). **Rationale:** spec/09 + spec/19 guest access.

### 6. Resource description is Tiptap; render via MessageContent
Resource `description` is Tiptap JSON (per schema). The detail page renders it with the existing `MessageContent`. No sanitization needed on read (sanitized on write in Item 30). **Rationale:** reuse the established rich-text renderer.

## Risks / Trade-offs

- **[Empty content now]** → No seeded shlokas/pothi/resources; all pages show empty states. Verified by seeding a couple of sample rows via SQL during the probe, then cleaning up. Real content arrives with Item 30.
- **[Index/DB divergence]** → Item 29 owns the index service + seed; Item 30's CRUD must call `upsert/remove` (recorded as the seam). Until Item 30, the boot seed keeps search correct for any existing rows.
- **[Source filter on free-text citation]** → `sourceCitation` is unstructured ("Gita 6.5"), so the source filter is a substring match, not an enum. Acceptable for v1; spec/27 lists sources as filter chips — those can map to substring queries.
- **[Shloka-of-the-day with empty queue]** → returns null → frontend shows nothing / a gentle empty state; never errors.

## Migration Plan

No DB migration (`migrate status` clean). Ship backend (content module + endpoints + shlokas index + today logic) → tests → frontend (3 pages + modals + nav) → verify end-to-end with temporarily-seeded sample rows (then clean up). Additive + read-only.
