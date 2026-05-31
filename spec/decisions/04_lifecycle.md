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

## Open Questions (area-specific)
- Exact value of `x` days for dormant trigger — system default TBD
- Notification mechanic when new weakness attached mid-journey (push, in-app badge, chat message?)
- What happens to a dormant journey's VM reminder cadence — does the system nudge VA or VM?

## Flags
- ⚠ Dormant state requires background scheduler — carry to integrations/tech constraints.
- ⚠ Journey weakness union filter — ensure ERC suggestion layer is built to re-evaluate on weakness attachment, not a one-time snapshot at journey start.
