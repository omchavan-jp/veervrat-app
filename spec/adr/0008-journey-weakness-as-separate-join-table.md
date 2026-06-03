# Journey has its own weakness join table, separate from ERC-level weakness tags

A journey tracks which weaknesses it was started from / has been attached to via a `journey_weakness` join table. This is separate and distinct from the `exposure_weakness`, `resolution_weakness`, and `challenge_weakness` tables that tag individual ERC entities.

These are two different relationships: the journey-level weakness tag records the diagnostic context ("this journey was started because the VA tested poorly on weakness X"), while ERC-level weakness tags record which weaknesses a specific exercise addresses. A single journey can accumulate multiple weakness contexts over time as the VA attaches new weaknesses mid-journey.

The ERC pool shown to the VA within a journey is determined by the union of ERC items whose weakness tags intersect with the journey's currently attached weaknesses — this filter must re-evaluate dynamically when a new weakness is attached, not snapshot at journey start.

## Considered Options
- **Single weakness tag at journey level, applied to all ERC** — rejected: doesn't allow individual ERC items to address different weaknesses; loses granularity.
- **ERC-level tags only, no journey-level tag** — rejected: no way to record the diagnostic context of why the journey was started; breaks the "attach new weakness mid-journey" flow.
- **Separate join tables at both levels** — chosen: preserves both the diagnostic context (journey) and the exercise specificity (ERC).
