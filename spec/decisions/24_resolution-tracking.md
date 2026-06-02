# Resolution Tracking & Time-Based Logging
_Last updated: 2026-06-02 | Round: R1_

## Context

Resolutions are habits or repeated practices within a journey. They have a `duration_weeks` field. Unlike exposures (discrete events) and challenges (one-time culminating tests), resolutions require tracking over time — a VA commits to doing something repeatedly for N weeks.

---

## Confirmed Decisions

### Resolution Structured Fields (pool level)
Each resolution in the central pool optionally has:
- `duration_weeks` — suggested duration
- `frequency_per_week` (integer, optional) — suggested times per week (e.g. 7 = daily, 3 = three times/week)
- `frequency_label` (text, optional) — human-readable label for the frequency (e.g. "Every evening", "3× per week") shown alongside the integer

These are suggestions set by admin when creating the pool resolution. Not enforced — they are the baseline that VAs can adjust.

### Journey-Level Customisation
When a VA selects a resolution for their journey, they can **tweak** the structured fields before confirming:
- Adjust `duration_weeks` (keep, extend, shorten)
- Adjust `frequency_per_week` and `frequency_label`
- These adjustments are stored on the journey-level resolution instance — the pool entry is unchanged.
- VA or VM can also adjust these mid-resolution — change is logged with an optional reason.
- VM can suggest different values via their sidenote on the resolution.

### Resolution Log (check-in model)
- VA logs **check-ins** against an active resolution — not a single "done" action.
- Each check-in: timestamp, optional note, and status:
  - `done` — completed this instance
  - `partial` — partially done
  - `missed` — didn't do it this time
- The system does not auto-mark missed periods. No enforcement — VA logs when they choose.
- Check-ins accumulate into a visible log showing streak and consistency pattern.

### Completion & Submission
- VA submits the resolution for closure when they feel the practice is complete (regardless of whether `duration_weeks` has elapsed or not).
- VM reviews the check-in log and overall consistency before approving.
- If no VM: VA self-approves.
- A resolution can be submitted for closure before `duration_weeks` has elapsed — the elapsed time and check-in log are visible to the VM for their review.

### Status Tracking
- Follows the standard ERC status model: `not_started → in_progress → submitted → approved / revisit`.
- `in_progress` begins when VA starts the first check-in (not when they activate the resolution).
- Time elapsed since first check-in is shown on the resolution card.

### Dashboard/Stats
- Resolutions shown in stats: active (in_progress), completed (approved).
- "Streak" or consistency indicator visible on the resolution card — number of consecutive check-in periods with `done` status.

- **Streak definition:** consecutive check-in submissions with `done` status. Calendar gaps between check-ins do not break the streak — no auto-missed entries.
- **Check-in reminders:** none. System does not nudge VA. VA logs when they choose.

## Open Questions (area-specific)
_(none — area closed)_

## Flags
- ⚠ Resolution duration is guidance, not enforcement — do not auto-complete or auto-fail based on date arithmetic alone.
- ⚠ Check-in frequency is not enforced — the log must support sparse/irregular entries without penalising gaps.
