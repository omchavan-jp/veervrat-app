# ERC entities attach directly to sentence, no intermediate plan entity

Exposures, resolutions, and challenges in the central content pool reference a sentence directly via sentence_id. There is no intermediate "plan" entity grouping them.

An earlier design used a `plan` table as a container (virtue → plan → ERC). This was dropped when it became clear that the sentence already serves as the natural grouping anchor, and the plan entity added indirection without adding information — virtue and weakness are both derivable from the sentence via its subvirtue.

## Considered Options
- **Plan entity as container** — rejected: redundant once sentence was confirmed as anchor; added a join with no structural benefit.
- **Direct sentence_id FK on ERC** — chosen: simpler schema, one less join, traceability preserved via sentence → subvirtue → virtue chain.
