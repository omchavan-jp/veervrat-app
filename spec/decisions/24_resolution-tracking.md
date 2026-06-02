# Resolution Tracking & Time-Based Logging
_Last updated: 2026-06-02 | Round: R1_

## Context

Resolutions are habits or repeated practices within a journey. They have a `duration_weeks` field. Unlike exposures (discrete events) and challenges (one-time culminating tests), resolutions require tracking over time — a VA commits to doing something repeatedly for N weeks.

---

## Confirmed Decisions

### Resolution Duration
- `duration_weeks` from the central pool is the suggested duration — a baseline, not a locked constraint.
- When a VA selects a resolution for their journey, the start date is recorded.
- End date = start date + duration_weeks. The system shows a countdown/progress indicator.
- VA or VM can adjust the duration mid-resolution (extend or shorten) — change is logged with a reason (optional).

### Resolution Log (check-in model)
- VA logs **check-ins** against an active resolution — not a single "done" action.
- Each check-in is a timestamped entry: date, a brief note (optional), and a completion status for that instance:
  - `done` — completed this instance
  - `partial` — partially done
  - `missed` — didn't do it this time
- There is no enforced frequency — VA logs when they choose. The system does not auto-mark missed days.
- Check-ins accumulate into a visible log (like a habit tracker — streak, consistency pattern).

### Frequency Guidance (not enforcement)
- The resolution's description may include a recommended frequency (e.g. "daily for 4 weeks", "every evening"). This is display guidance only.
- The system does not enforce frequency — no auto-fail, no auto-complete.
- VM can add a frequency recommendation as part of their sidenote on a suggested resolution.

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

## Open Questions (area-specific)
- Streak definition — is it consecutive calendar days, or consecutive check-in submissions? TBD implementation detail.
- Check-in reminder notifications — should the system nudge the VA to check in? (e.g. "You haven't logged your resolution today") TBD.

## Flags
- ⚠ Resolution duration is guidance, not enforcement — do not auto-complete or auto-fail based on date arithmetic alone.
- ⚠ Check-in frequency is not enforced — the log must support sparse/irregular entries without penalising gaps.
