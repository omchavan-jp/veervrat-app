# Public VA Profile
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Presence & Activity
- **Last active** — day-level granularity ("Today", "1 day ago", etc.). VA can hide from profile (privacy setting). Default: visible.
- **Currently active** (online indicator) — shown when VA is using the app. VA can toggle on/off from settings. Default: on.
- When last active is hidden: field not shown (no "hidden" label).

### Profile Fields (fixed set, all public by default)
Each field is individually togglable by the VA. Default state: public.

- Display name
- Avatar
- Member since date
- Journeys completed (count)
- Tests taken (count)
- Active journeys (count)
- Weaknesses worked on (names only — no scores, no sentence detail)
- Exposures active/completed (count)
- Resolutions active/completed (count)
- Challenges completed (count)
- Public experience log entries (authored by this VA, marked Public)

### Visibility Controls
- VA can toggle each field individually — on/off.
- Default: all fields public.
- If a field is toggled off, it is hidden entirely from the profile (not shown as "hidden" or "—").

### Profile Discovery
- Profile is accessible from any place a VA's name appears: blog author, experience card, user search results, VM invitation flow.
- Profiles have a stable public URL (e.g. `/u/username` or similar).

### Follow
- Any authenticated user can follow a VA.
- Follow is one-way (not a mutual connection). Following does not grant access to private data.
- What following enables: TBD (e.g. see their public activity in a feed, get notified of new public logs/blogs). Detail in community/social round.
- Guests cannot follow — auth required.

### What is Never Public
Regardless of VA's visibility settings, these are never shown on a public profile:
- Test scores or sentence-level answers
- Journey contents (ERC selection, experience log entries, chat)
- VM assignments
- Experience log entries marked "Only me" or "Friends"

- **"Friends" visibility tier:** = mutual follows (both follow each other). Consistent with one-way follow system — friends are the subset where both parties follow each other.
- **Last active hidden behavior:** field is **absent entirely** from the profile — not shown as "—" or any placeholder. Consistent with "no hidden label" intent.
- **Username and display name:** separate fields. Display name = real name shown everywhere. Username = unique handle for search + public URL `/u/username`. Both set at account setup.
- **Full profile privacy:** yes — VA can make entire profile private (hidden from guests and other authenticated users). Profile URL returns a "This profile is private" screen.
- **Follow feed / activity stream:** deferred to future version — not in v1.

## Open Questions (area-specific)
- Follow feed / activity stream — deferred to future version.

## Flags
- ⚠ Follow relationship is one-way; "Friends" = mutual follows — resolved and consistent.
