# Pre-Implementation Spec Audit
_Date: 2026-06-02 | Status: Unresolved_

---

## BLOCKING — Must resolve before any implementation

1. **Test response scale and scoring formula** — test UI, suggestion algorithm, and result screen all depend on this. Entirely absent from spec.
2. **Pool ERC mid-journey addition** (C-04) — "selected once at start" vs "new ERC available mid-journey" is contradictory and unresolved.
3. **Moderator scope for custom ERC review** (C-02) — moderator simultaneously has "no journey access" and "sees journey context" for review. Contradictory.
4. **14 missing permissions** in the permissions matrix (PM-01 through PM-14 below).
5. **9 missing data model entities** (DM-01 through DM-12 below) — all confirmed v1 features.
6. **VM self-withdrawal flow** — affects pending approval queue, migration UI, global VM behavior. Unresolved.
7. **`admin.view_chat` matrix cell** — still shows "TBD" but is resolved in prose. Matrix must be corrected.
8. **Journey start from Virtues browser (no test context)** — what weakness is attached? ERC filter cannot be built.
9. **Loose theme tags: managed taxonomy vs free-form** — blocking schema for shlokas and resources.
10. **Resources page guest access** — blocks routing and auth middleware.

---

## 1. Contradictions

**C-01: Last active hidden — field absent vs. shown as "—"**
- `10_public-profile.md`: field not shown at all
- `13_user-search.md`: shown as "—" or hidden
→ Pick one: field is absent (preferred — consistent with "no hidden label" intent)

**C-02: Moderator + journey access (BLOCKING)**
- `05_permissions.md`: "No journey access" for moderators
- `05_permissions.md` + `17_moderation.md`: custom ERC review includes "submitter profile + journey context"
→ Must define exactly what "journey context" means for a moderator — limited (ERC item + journey title only) vs. full journey access

**C-03: ERC status states — stale text in `03_flows.md`**
- Line 44 still says "exact states TBD — examples: pending, completed, closed"
- Canonical states are defined later in same file: `not_started → in_progress → submitted → approved / revisit`
→ Remove stale text at line 44

**C-04: Pool ERC mid-journey (BLOCKING)**
- `03_flows.md`: pool items selected "once at journey start"
- `04_lifecycle.md`: VA notified of new ERC available when weakness attached mid-journey
→ Decision needed: can VA select new pool items mid-journey after weakness attachment, or are they just informed?

**C-05: VM self-removal from global assignment — migration UI unclear**
- VA-initiated global VM removal triggers migration UI (specced)
- VM self-withdrawal from global assignment — does it also trigger migration UI for the VA?
→ Decision needed

**C-06: `admin.view_chat` matrix cell (BLOCKING)**
- Matrix: "TBD"
- Prose (`05_permissions.md` + `deferred.md`): resolved as "admin cannot view chat v1"
→ Update matrix cell

---

## 2. Gaps — Implied But Never Specced

**G-01: Notification system — no spec exists**
Mentioned in 7+ files. Need: notification data model, bell/badge UX, per-type opt-out controls, read/unread state.

**G-02: VM public profile — no spec**
Only VA profile is specced (`10_public-profile.md`). VM profile fields beyond credibility stat are undefined.

**G-03: Account Settings page — no spec**
Referenced by: language toggle, online indicator, last active privacy, email notification per-VM, chat mute, global VM settings, profile field toggles. No `decisions/XX_account-settings.md` exists.

**G-04: Test response scale and scoring formula (BLOCKING)**
"Sometimes/Never flagged", "lowest-scored sentences" — but the response options, labels, and scoring are never defined.

**G-05: Resources page guest access (BLOCKING)**
Explicitly open in `19_pothi-redesign.md`, not tracked in `open/questions.md`.

**G-06: Pothi section editability (admin vs. moderator)**
Explicitly open in `19_pothi-redesign.md`, not tracked in `open/questions.md`.

**G-07: Blog + comment data model absent from `02_data-model.md`**

**G-08: Follow relationship data model absent**

**G-09: Notification entity absent from data model**

**G-10: Invite token data model absent**

**G-11: VM sidenote data model absent** (polymorphic FK or three separate tables?)

**G-12: Shloka / Pothi / Resources data models absent**

**G-13: Loose theme tags — managed taxonomy vs free-form (BLOCKING)**
Affects schema. Unresolved for both shlokas and resources. Not tracked in `open/questions.md`.

**G-14: Journey start from Virtues browser — weakness context (BLOCKING)**
VA starts journey from Virtues browser (not from test). No test → no "came from weakness." What ERC filter applies?

**G-15: Blog comment nesting (flat vs. threaded) — TBD, not tracked**
Affects schema (parent_comment_id).

**G-16: `admin.manage_users` scope — never defined**
Role assignment, suspension, forced deletion, email override, impersonation — all unspecced.

**G-17: SEO / crawlability — open, not tracked**
`09_guest-access.md` line 39. Infrastructure decision (SSR, meta tags, robots.txt, sitemap.xml) needed before any public page implementation.

**G-18: VM self-withdrawal flow — unresolved**
`04_lifecycle.md` says VM can withdraw. `22_vm-dashboard.md` says "assumed yes — TBD." Pending approval queue handling, migration UI implications, and global VM withdrawal behavior all undefined.

---

## 3. Missing Flows / States

**F-01: Journey `not_started → active` transition never described**
What triggers it? What is `not_started`? Is ERC selection part of this transition?

**F-02: ERC `not_started → in_progress` trigger never described**
Automatic or manual? What is the UI affordance?

**F-03: VA journey closure submission — entry point never described**
Where is the "Submit for closure" button? What conditions enable it? Must all ERC be `approved` first?

**F-04: Draft test resume flow — where does the VA find their draft?**
Dashboard? Test entry screen? What if weakness content changed since draft was saved?

**F-05: VM suggestion accept/reject by VA — flow unspecced**
`22_vm-dashboard.md` references "accepted/rejected by VA" as a status, but no spec describes the VA's accept/reject UI, what "accept" means (auto-activate?), or whether VM is notified.

**F-06: Experience log visibility change after publish — can VA change it?**
Only retroactive behavior on unfollow is specced. VA's own control post-publish is undefined.

**F-07: Cancellation of pending global VM invite — VA flow and invitee notification**
`13_user-search.md` says VA must cancel before assigning a new global VM. No cancellation UI or notification defined.

**F-08: Journey weakness attachment at start — multiple test contexts (BLOCKING)**
If a sentence appears in tests for weakness A and weakness B (both taken by VA), and VA starts journey from test A's result — is weakness B also attached at start? What if they navigate from weakness B's result later?

---

## 4. Missing Permissions (PM-01 through PM-14)

| # | Permission | Where referenced |
|---|---|---|
| PM-01 | `journey.resume` | `04_lifecycle.md` — paused/dormant resume |
| PM-02 | `erc.deactivate` / `erc.remove` | `03_flows.md` — VA deactivates/removes pool items |
| PM-03 | `weakness.attach` | `04_lifecycle.md` — mid-journey weakness attachment |
| PM-04 | `challenge.configure_threshold` | `03_flows.md` — VM overrides challenge suggestion threshold |
| PM-05 | `vm_invitation.cancel` | `04_lifecycle.md` — VA cancels pending invite |
| PM-06 | `vm_invitation.decline` | `04_lifecycle.md` — invitee declines |
| PM-07 | `vm_relationship.withdraw` | `04_lifecycle.md` — VM withdraws from assignment |
| PM-08 | `blog.create` / `blog.edit` / `blog.delete` | `16_content-pages.md` |
| PM-09 | `comment.create` / `comment.delete` / `comment.hide` / `comment.report` | `16_content-pages.md` |
| PM-10 | `follow.create` / `follow.remove` | `10_public-profile.md` |
| PM-11 | `shloka.*` / `pothi.edit` / `resource.*` | `17_moderation.md` |
| PM-12 | `experience_log.edit` / `experience_log.delete` | `14_experience-logging.md` |
| PM-13 | `global_vm.view_va_guidance` | `18_my-vratmitras-chat.md` line 61 |
| PM-14 | `custom_erc.edit` / `custom_erc.delete` (pre-submission) | `03_flows.md` |

---

## 5. Missing Data Model Entities

| # | Entity | Where confirmed |
|---|---|---|
| DM-01 | Community blog | `16_content-pages.md` |
| DM-02 | Blog comment | `16_content-pages.md` |
| DM-03 | Follow / user_follow | `10_public-profile.md` |
| DM-04 | Notification | `07_integrations.md` + everywhere |
| DM-05 | Invitation / invite_token | `13_user-search.md` |
| DM-06 | VM sidenote | `CONTEXT.md`, `03_flows.md` |
| DM-07 | Shloka | `16_content-pages.md`, `19_pothi-redesign.md` |
| DM-08 | Pothi section | `19_pothi-redesign.md` |
| DM-09 | Resource | `19_pothi-redesign.md` |
| DM-10 | Challenge threshold override (per-journey-VM) | `03_flows.md` |
| DM-11 | Shloka-of-the-day schedule + queue | `17_moderation.md` |
| DM-12 | Pothi-section ↔ Shloka join | `19_pothi-redesign.md` — same entity or embedded? |

---

## 6. Cross-Spec Dependencies Not Resolved

**X-01: `21_virtue-first-reorientation.md` lists 4 files to update — updates are incomplete**
`16_content-pages.md` shloka tag display order and `03_flows.md` result screen framing changes were not fully propagated.

**X-02: `global_vm.view_va_guidance` in `18_my-vratmitras-chat.md` — not in permissions matrix**

**X-03: Featured experience curation UI — `14_experience-logging.md` defers to `17_moderation.md`; neither actually specs the UI**

**X-04: VM Guidance page location resolved in `22_vm-dashboard.md` but still shows as open question in `18_my-vratmitras-chat.md`**

**X-05: `09_guest-access.md` public experience log visibility still reads as unresolved forward-reference — answer is in `14_experience-logging.md`**

**X-06: "What is Veervrat" single-source-of-truth admin content entity — flagged in `16_content-pages.md`, not specced in `17_moderation.md` or `19_pothi-redesign.md`**

**X-07: `04_lifecycle.md` references "same notification system as other notifications" — that system has no spec**

**X-08: `08_out-of-scope.md` still references mobile number and WhatsApp toggle as onboarding fields — dropped in `12_onboarding.md` but stale reference not cleaned up**
