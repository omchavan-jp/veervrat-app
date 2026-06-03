# Global Experience Logging
_Last updated: 2026-06-01 | Round: R2_

## Confirmed Decisions

### What It Is
- A free-form text reflection written by a VA, not tied to any specific journey or ERC item.
- Distinct from journey-level experience log entries (which are tied to a journey and its ERC items).
- Accessible from the main dashboard ("Log your experience" CTA).

### Visibility Tiers
- **Only me** — private, visible to VA only.
- **Friends** — visible to mutual follows (both parties follow each other).
- **Public** — visible to anyone, including guests.

### Tagging
- A global experience log entry can optionally be tagged to any entity in the data model: weakness, virtue, subvirtue, sentence, exposure, resolution, challenge, or journey.
- Multiple tags allowed. All optional.

### Public Experience Pool & Sidebar
- All public experience entries form a **browsable public pool** (public experiences page).
- The **right sidebar carousel** ("Community experiences") is an **editorial selection** — admins/moderators choose which public entries to feature from the pool.
- Featured entries are curated, not algorithmically selected.

### Distinction from Community Blogs
- **Global experience log entries** — raw, personal reflections. No title required. Tagged to data model entities. Three visibility tiers.
- **Community blogs** — structured content with title, author, one-liner description. Different content type, different creation flow. Specced separately.

### Draft Model
- Mid-entry exit → prompt: "Save as draft" or "Discard."
- Drafts are always **Only me** (private) until published.
- On publish: VA sets visibility tier (Only me / Friends / Public).
- Drafts persist indefinitely until published or manually deleted.

### Post-Publish Visibility Change
- VA can change the visibility tier of a published experience log entry at any time (e.g. Public → Only me, Friends → Public).
- Changes take effect immediately. If downgraded (e.g. Public → Friends), the entry becomes invisible to those who no longer qualify — no notification sent to affected viewers.

### Additional Confirmed Decisions
- **Entity backlinks:** tagging an experience entry to an entity creates a visible backlink — the entry appears on that entity's page/detail view for users with permission to see it.
- **Retroactive visibility:** if a mutual follow is broken, previously "Friends" entries become invisible to the unfollowed person immediately. Content still exists for the author.
- **Character limit:** none for v1.
- **Media attachments:** images supported (stored via MinIO). Rich entry format — text + inline images, similar to Substack-style composition.

- **Sidebar curation:** moderators select featured public experience entries for the right sidebar carousel via the moderator display content management UI. The full browsable pool of public entries is available to moderators for selection. This is the moderation UI referenced in `decisions/17_moderation.md`.

- **Media limits:** max 10MB per image, max 5 images per entry. Images only (JPG, PNG, GIF, WebP).
- **Rich text formatting:** full editor — bold, italic, headings, links, inline images. Same editor as community blogs.
- **VM visibility of tagged entries:** if a VA tags a global experience log entry to a journey, the VM assigned to that journey can see the entry.

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ "Friends" visibility tier depends on mutual follow — must be consistent with follow system spec. If follow is one-way, "friends" = mutual follows (both follow each other).
- ⚠ Moderator curation of sidebar experiences — needs a moderation UI for selecting/deselecting featured entries. Covered under moderator display content management spec.
