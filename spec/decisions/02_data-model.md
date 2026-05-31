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

## Open Questions (area-specific)
- One challenge per journey or many? — RESOLVED R5: multiple allowed

## Flags
- ⚠ Original description said "vratmitra proposes one *or many* challenges." Central pool has one per sentence. Journey-level cardinality must be confirmed before lifecycle is designed — deferred.
