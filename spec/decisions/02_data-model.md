# Data Model
_Last updated: 2026-05-31 | Round: R2_

## Confirmed Decisions
- **Hierarchy:** virtue → subvirtue (1:N) → sentence (1:N). One sentence belongs to exactly one subvirtue.
- **Weakness:** linked to N subvirtues (across virtues) via a join table with priority. One subvirtue can belong to multiple weaknesses.
- **Sentence is the atomic journey anchor:** one journey is built around exactly one sentence.
- **ERC pool:** exposures, resolutions, and challenges exist in a central pool, each anchored to a sentence. Each entity in the pool carries one or more weakness tags (exposure_weakness, resolution_weakness, challenge_weakness join tables).
- **Journey ERC:** items in a journey are drawn from the central pool OR created fresh (by vratmitra or vratarthi) for that specific journey. Both sources can coexist in the same journey.
- **Weakness tagging per ERC entity:** each individual exposure, resolution, and challenge carries its own weakness tag(s) — not just at the sentence level.

## Open Questions (area-specific)
- One challenge per journey or many? — ⚠ see flag below — flagged R2
- Is a test result stored per attempt (full history) or only latest retained? — flagged R2
- Does a journey have a user-given title/name, or is it identified purely by its sentence? — flagged R2

## Flags
- ⚠ Original description said "vratmitra proposes one *or many* challenges." Current DB schema supports one challenge per sentence in the central pool, but nothing prevents multiple per journey. One vs. many per journey must be confirmed before lifecycle is designed.
