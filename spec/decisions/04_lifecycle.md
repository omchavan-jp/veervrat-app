# Lifecycle States
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### Test Lifecycle
- A test is a point-in-time event: taken → result stored. No draft, no in-progress, no expiry.
- All attempts retained. Latest result drives ERC suggestions.

### Journey States
- States: `not_started → active → completed`
- **`paused`**: VA manually marks journey as paused. Can be resumed.
- **`dormant`**: system-triggered after `x` days of no views or updates. Default value of `x` is a system-level default (exact value TBD). VA can resume from dormant.
- ⚠ Dormant state requires a background job (cron/scheduler) — infrastructure implication to carry into tech constraints.
- A journey can sit active indefinitely until completed or manually paused.
- No "abandoned" or negative terminal state — a journey is either active, paused, dormant, or completed.

### Journey — One Per Sentence At A Time
- A VA can have at most one non-completed journey per sentence at any time.
- If a prior journey for a sentence is **completed**, VA can start a new one for the same sentence (same or different weakness context).
- If a prior journey is **active / paused / dormant**, VA cannot start a new one — they are shown the existing journey's state and offered to attach the new weakness context to it instead.

### Journey Weakness Attachment
- A journey has its own weakness tags (`journey_weakness` join table — separate from ERC-level weakness tags).
- Initial weakness(es) set at journey start based on which test the VA came from.
- Additional weaknesses can be attached mid-journey (e.g. same sentence surfaces in a second weakness test).
- **ERC pool shown = union filter**: all ERC items for this sentence whose weakness tags intersect with the journey's currently attached weaknesses.
- When a new weakness is attached mid-journey: VA is notified that new ERC items are now available.

### ERC Entity Lifecycle
- States: `not_started → in_progress → submitted → approved` or `submitted → revisit`
- `revisit`: VM returns item for rework. VA revises and resubmits.
- If no VM: VA self-approves directly from `submitted`.
- Deactivated items: remain visible in journey (greyed out). VA can permanently remove.

### Journey Completion
- VA works through ERC items → submits each for approval.
- VM (or VA self) approves all items.
- Challenge(s) proposed, completed, approved.
- VM (or VA self) approves journey closure → state moves to `completed`.

### VM Relationship Lifecycle
- VM invitation requires **explicit acceptance** by the invited user before the relationship becomes active.
- Until accepted: relationship is in `pending` state. VA can cancel; invitee can decline.
- Once accepted: relationship is `active`. No expiry — persists until VA removes VM or VM withdraws.
- VM relationship has no other formal states — it is either pending, active, or gone.

### VM Removal Mid-Journey
- VA can remove a VM from a journey at any time.
- **VM can also withdraw themselves** from a journey-level assignment — no VA action needed.
- **Global VM self-withdrawal:** VA is notified and shown the same migration UI as VA-initiated global VM removal (choose what to do with existing journey assignments).
- On any removal/withdrawal: pending approvals (items in `submitted` state) are **left pending** — not auto-approved, not auto-returned.
- Incoming VM inherits the pending queue. VA can also revoke their own submissions and self-approve instead.

### Completed Journeys
- Completed journeys are permanently read-only. No reopening.
- To continue working on the same sentence: VA starts a new journey.

- **Dormant trigger:** 30 days of no views or updates to the journey.
- **New weakness attached — notification:** in-app notification to VA. Mechanic: in-app badge/bell notification (same system as other notifications).
- **Dormant journey nudge:** system notifies both VA and VM when a journey goes dormant.
- **Pending invitation visibility:** VA can see pending invitation state clearly from their Invitations section. VA can send a reminder to the invitee (one reminder, not unlimited).

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ Dormant state requires background scheduler — carry to integrations/tech constraints.
- ⚠ Journey weakness union filter — ensure ERC suggestion layer is built to re-evaluate on weakness attachment, not a one-time snapshot at journey start.
