# Moderation & Display Content Management
_Last updated: 2026-06-01 | Round: R1_

## Confirmed Decisions

### Who Can Do What

#### Admin-only
- Add/edit/delete taxonomy entities: virtues, subvirtues, weaknesses (core taxonomy — not user-proposable)
- Manage "What is Veervrat" page content and Saka calendar informational page
- All moderator capabilities below

#### Admin + Moderator
- Review and approve/reject custom ERC proposals (submitted by VA/VM from journeys)
- Manage Pothi — add/edit/delete shlokas, manage tags (formal + loose)
- Schedule "Shloka of the day" for specific dates
- Curate sidebar "Shloka of the day" queue/playlist (auto-advances when no specific shloka is scheduled)
- Select featured community experiences for right sidebar carousel
- Select featured community blogs for left sidebar "From the community" section
- Hide or delete blog comments on any blog
- Manage display content on app screens generally

### Taxonomy — Admin Only
- Virtues, subvirtues, and weaknesses are admin-only additions. Users cannot propose new taxonomy entities.
- Sentences and ERC are content — user-proposable via the custom ERC review pipeline (already specced).

### Shloka of the Day Scheduling
- Admin schedules specific shlokas for specific dates.
- If no shloka is scheduled for a date: system auto-advances from a queue/playlist.
- Queue is admin/moderator-managed (ordered list of shlokas, cycles through).
- Scheduled specific dates take priority over the queue.

### Moderation Area
- Lives as a section within the existing app (`/moderation` route group, already in CLAUDE.md architecture).
- Not a separate tool.
- All admin/moderator actions are audit-logged (already a hard rule in CLAUDE.md).

- **Moderator pending review dashboard:** yes — moderators see a unified dashboard of all pending items (ERC proposals, reported blog comments, etc.).
- **Blog comment reporting:** yes — any authenticated user can report a comment for moderator review.
- **Shloka queue reordering:** yes — moderators can reorder the queue.

## Open Questions (area-specific)
- Custom ERC review UI layout — exact layout TBD (implementation detail; content confirmed: submitter profile + journey context)

## Flags
- ⚠ Taxonomy is admin-only — ensure no API endpoint allows non-admin creation of virtue/subvirtue/weakness entities.
