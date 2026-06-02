# Content Pages & Cultural Elements
_Last updated: 2026-06-01 | Round: R2_

## Confirmed Decisions

### Saka Calendar Display
- Shows today's Saka (Rashtriya Saur / Indian National Calendar, solar) date alongside the Gregorian date on the dashboard. Minified display — not prominent, contextual.
- Purely a display element in v1. No functional alignment with journeys or milestones.
- Includes an informational link/redirect: either to an external resource (e.g. Wikipedia) or an in-app modal/page explaining what the Saka calendar is, its history, and significance. Exact treatment TBD (modal vs page vs external link).
- Consistent with the app's intentional lean into Indian cultural identity alongside shlokas, Devanagari, Pothi.

### Community Blogs
- Any VA or VM can write and publish a blog post.
- **Home screen sidebar** ("From the community") is **moderated** — admins/moderators select which blogs are featured there.
- Full blog listing page is unmoderated — all published blogs appear there.
- Blog structure: title (required), body (rich text + images, same format as experience entries), author attribution.
- Visibility: public by default. No private/friends tier for blogs — if published, it's public.
- Draft model: same as experience logs — mid-edit exit → "Save as draft" or "Discard." Drafts private until published.

### What is Veervrat / Process Chart / Core Philosophy
- Three-tab page accessible from nav.
- **Tab 1 — What is Veervrat:** philosophy, purpose, "Our stance" pull quotes, Devanagari lines.
- **Tab 2 — Process Chart:** 4-stage model (Recognition → Study → Practice → Integration) with stage labels, descriptions, bullet details.
- **Tab 3 — Core Philosophy:** philosophy grid (4 tiles), Pothi CTA.
- Accessible to guests (no auth required).
- Same content shown during framework onboarding — this page is the persistent reference after onboarding.
- Content managed by admin/moderator (part of display content management).

### Shloka of the Day
- Rotating carousel in right sidebar: Devanagari text + transliteration + English meaning + source citation + prev/next navigation.
- Curated and scheduled by admin/moderator.
- Expands to full Shloka detail modal on click.

### Shloka Detail Modal
- Two-column: full text (Devanagari + transliteration + meaning + source) on left; contextual notes ("Connects to" weakness/theme tags) on right.
- Tags link to relevant weakness or virtue pages.

### Philosophy Modal ("Why we study shlokas")
- Accessible from right sidebar link.
- Prose with drop cap, pull quotes, Devanagari lines with glosses.
- Content managed by admin/moderator.

### Pothi (Shloka Library)
- Searchable, filterable library of shlokas and sacred texts.
- Sections: Shlokas (active), Stotras / Subhashitas / Upanishads / Bhagavad Gita / Commentaries (coming soon in v1, placeholders shown).
- Each shloka: reference, Devanagari text, theme/weakness tags, expandable to full detail modal.
- Filter by source (Gita, Upanishad, etc.) and search by text/reference.
- Accessible to guests.
- Content managed by admin/moderator (adding/editing shlokas, tagging).

### Saka Calendar — Informational Treatment
- Clicking the Saka date opens an **in-app modal** with a brief explanation of the Saka (Rashtriya Saur) calendar — what it is, why it's shown here.
- Modal includes a "Learn more" link to a **dedicated in-app page** with fuller historical and cultural context.
- No external redirects — keeps users within the app.
- Content managed by admin.

### Pothi — Shloka Tagging
- A shloka can be tagged to any combination of:
  - Formal data model entities: weakness, virtue, subvirtue, sentence, exposure, resolution, challenge
  - Loose theme labels — free-form tags not linked to the formal data model (e.g. "discipline", "surrender", "self-effort")
- Both tag types can coexist on the same shloka.
- Tags link to relevant entity pages where applicable (formal tags). Loose theme tags are displayed as labels only.

### Community Blogs — Comments
- Authenticated users (VA, VM) can comment on community blogs. Guests cannot.
- **Blog author** can delete or hide specific comments on their own blog.
- **Moderators** can delete or hide any comment on any blog.
- Hidden comments: hidden from public view but remain visible to the comment author (they see it marked as hidden, not deleted).
- Deleted comments: permanently removed.

## Open Questions (area-specific)
- Shloka of the day scheduling — how far in advance can admin schedule? TBD implementation detail.
- Blog comment nesting — flat (top-level only) or threaded replies? TBD.
- Loose theme tags on shlokas — is there a managed taxonomy (admin-defined labels) or truly free-form? TBD.

## Flags
- ⚠ "What is Veervrat" page content mirrors framework onboarding content — single source of truth is admin-managed content stored as a CMS entity, rendered in both the onboarding flow and the "What is Veervrat" nav page. Not duplicated in code.
- ⚠ Shloka tagging spans both formal data model and loose labels — two distinct tag systems on one entity. Ensure UI clearly distinguishes them (formal tags shown as structured chips linked to entities; loose tags shown as plain text labels).
