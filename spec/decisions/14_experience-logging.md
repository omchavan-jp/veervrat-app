# Global Experience Logging
_Last updated: 2026-06-01 | Round: R1_

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

## Open Questions (area-specific)
- Can a VA tag to any combination of entities (confirm: weakness + sentence + journey simultaneously)?
- Does tagging to an entity create a visible link — e.g. the experience shows up on the weakness page or sentence page?
- Character limit on experience entries? TBD.
- Can experience entries have media attachments (images)? TBD.
- "Friends" tier — if a mutual follow is broken (one unfollows), do previously "Friends" entries become invisible to the unfollowed person retroactively?

## Flags
- ⚠ "Friends" visibility tier depends on mutual follow — must be consistent with follow system spec. If follow is one-way, "friends" = mutual follows (both follow each other).
- ⚠ Moderator curation of sidebar experiences — needs a moderation UI for selecting/deselecting featured entries. Covered under moderator display content management spec.
