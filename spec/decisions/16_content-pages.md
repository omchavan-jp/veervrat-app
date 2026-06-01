# Content Pages & Cultural Elements
_Last updated: 2026-06-01 | Round: R1_

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

## Open Questions (area-specific)
- Saka calendar: in-app modal vs external link for informational redirect — TBD (design decision)
- Blog comments — can readers comment on community blogs? TBD.
- Pothi shloka tagging to weaknesses — same tag system as ERC weakness tags, or a separate tagging layer?
- Shloka of the day scheduling — how far in advance can admin schedule? TBD implementation detail.

## Flags
- ⚠ "What is Veervrat" page content mirrors framework onboarding content — must stay in sync. Single source of truth should be admin-managed content, pulled into both places.
