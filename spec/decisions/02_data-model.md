# Data Model
_Last updated: 2026-05-31 | Round: R2_

## Confirmed Decisions
- **Hierarchy:** virtue → subvirtue (1:N) → sentence (1:N). One sentence belongs to exactly one subvirtue.
- **Weakness:** linked to N subvirtues (across virtues) via a join table with priority. One subvirtue can belong to multiple weaknesses.
- **Sentence is the atomic journey anchor:** one journey is built around exactly one sentence.
- **ERC pool:** exposures, resolutions, and challenges exist in a central pool, each anchored to a sentence. Each entity in the pool carries one or more weakness tags (exposure_weakness, resolution_weakness, challenge_weakness join tables).
- **Journey ERC:** items in a journey are drawn from the central pool OR created fresh (by vratmitra or vratarthi) for that specific journey. Both sources can coexist in the same journey.
- **Weakness tagging per ERC entity:** each individual exposure, resolution, and challenge carries its own weakness tag(s) — not just at the sentence level.
- **Challenges per journey:** deferred — cardinality (one vs. many) not yet confirmed.
- **Test result storage:** all attempts are stored (full history retained). Only the latest result per weakness per user is used for sentence suggestions. History is available for stats/trends.
- **Journey title:** journeys have a user-editable title. Default is the sentence text or an auto-generated name (shown to user for approval). User can override at any time.

- **Journey weakness tags:** a journey has its own `journey_weakness` join table — records which weaknesses the journey was started from / has been attached to. Separate from ERC-level weakness tags.

- **Virtue-first display priority:** virtue/subvirtue tags are shown first in all ERC and content displays. Weakness tags are retained in the DB and shown below. This is a display/framing change — no schema change. Virtue/subvirtue tag is not required on ERC items; when present, it surfaces first in the UI.

### Additional Entities (confirmed v1, data model required)

**User / Auth**
- `user` — id, display_name, username (unique), email, avatar_url, gender, dob, language, created_at, updated_at, deleted_at (soft delete → anonymisation)
- `user_follow` — follower_id FK user, followee_id FK user, created_at. Unique (follower_id, followee_id).

**Invitation**
- `invitation` — id, inviter_id FK user, invitee_email, invitee_user_id (nullable FK user), type (enum: platform / vm_global / vm_journey), scope_id (nullable FK journey), status (enum: pending / accepted / declined / expired / cancelled), channel (enum: in_app / email / external), invited_at, expires_at, accepted_at, created_at

**Notification**
- `notification` — id, recipient_id FK user, actor_id (nullable FK user), event_type (enum), resource_type (string), resource_id (uuid), read_at (nullable), dismissed_at (nullable), created_at

**VM Sidenote**
- `vm_sidenote` — id, vm_id FK user, entity_type (enum: exposure / resolution / challenge), entity_id (uuid), text, acknowledged_by_va_at (nullable), revoked_at (nullable), created_at, updated_at
- Polymorphic: entity_type + entity_id references the journey-level ERC item (not the pool item).

**Resolution (pool)** — existing entity gains two optional fields:
- `frequency_per_week` (nullable integer) — suggested times per week
- `frequency_label` (nullable text) — human-readable label (e.g. "Every evening")

**Resolution journey instance** (the journey-level copy of a selected resolution):
- Stores VA-customised values: `duration_weeks`, `frequency_per_week`, `frequency_label` (all editable, default to pool values)
- `started_at` (timestamp), `submitted_at` (nullable), `approved_at` (nullable)

**Resolution Check-in**
- `resolution_checkin` — id, resolution_journey_id FK (journey-level resolution instance), va_id FK user, status (enum: done / partial / missed), note (nullable text), checked_in_at, created_at

**Blog & Comments**
- `blog` — id, author_id FK user, title, body (rich text), status (enum: draft / published), published_at, created_at, updated_at, deleted_at
- `blog_comment` — id, blog_id FK blog, author_id FK user, body, hidden (bool), hidden_by (nullable FK user), parent_comment_id (nullable FK blog_comment, for future threading), created_at, updated_at, deleted_at

**Content (Pothi / Shlokas / Resources)**
- `shloka` — id, devanagari_text, transliteration, meaning_en, meaning_mr, source_citation, loose_tags (text array), created_at, updated_at
- `shloka_tag` — shloka_id, entity_type (enum: virtue/subvirtue/weakness/sentence/exposure/resolution/challenge), entity_id (uuid). Polymorphic formal tags.
- `pothi_section` — id, section_number (int), title_en, title_mr, intro_text, congregation_response (nullable), post_shloka_commentary, created_at, updated_at
- `pothi_section_shloka` — pothi_section_id, shloka_id, sort_order. A Pothi section references shlokas from the shared shloka entity.
- `resource` — id, type (enum: file / link), url (nullable), file_path (nullable), thumbnail_url, title, one_liner (nullable), description_rich_text (nullable), loose_tags (text array), created_by FK user, created_at, updated_at
- `resource_tag` — resource_id, entity_type (enum), entity_id (uuid). Polymorphic formal tags.

**Shloka Schedule & Queue**
- `shloka_schedule` — id, shloka_id FK shloka, scheduled_date (date, unique). Admin schedules specific shlokas for specific dates.
- `shloka_queue_item` — id, shloka_id FK shloka, position (int, unique). Ordered playlist for auto-advance when no shloka is scheduled.

**Challenge Threshold Override**
- Stored on the journey-VM assignment record (or as a separate `journey_vm_config` table): `threshold_exposures_required` (int, default 1), `threshold_resolutions_required` (int, default 1). Set by VA or VM; VM changes notify VA.

## Open Questions (area-specific)
- One challenge per journey or many? — RESOLVED R5: multiple allowed

## Flags
- ⚠ VM sidenote is polymorphic — entity_type + entity_id. Ensure FK integrity is handled at application layer (SQLite-style polymorphism or Postgres check constraints).
- ⚠ `blog_comment.parent_comment_id` is nullable — threading is not implemented in v1 (flat comments only). Field exists for future threading without schema migration.
