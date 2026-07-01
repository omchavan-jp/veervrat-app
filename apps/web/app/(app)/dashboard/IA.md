# Dashboard — Information Architecture (decision record)

> Why this file exists: the dashboard's problem was never styling — it was that every block sat at one elevation/density on a flat plane, so the eye landed nowhere and the screen never answered "what do I do now?". This records the priority, job, and permitted weight of each zone so a future "make it nicer" pass can't silently undo the structure. Execution rules: `documentation/15a_UI-Consistency-Rules.md`.

## The daily loop (this drives the hierarchy)
Veervrat's recurring habit is **working an active journey** (check-ins, ERC items, logging experiences). **Study is occasional discovery**, not the daily action. So the hero must answer the loop, not the menu:
- **Returning user with an active journey** → hero = *continue that journey*.
- **New user with no active journey** → hero = *Study* (you must discover a weakness before you can start a journey). This is the only state where Study is primary.

## Zones (top → bottom)

### A — Header · Priority 3 · compact (chrome with personality)
- Saka+Gregorian date (one small line) + greeting, compact. Keep the serif greeting (brand), but it must not eat the fold.
- "Log experience" moves OUT of the header → it's a secondary action under the hero (Zone C), where daily actions belong.

### B — Status · Priority 2 · one dense row, no cards
- Single horizontal row of **personal** counts (virtues, subvirtues, active/completed journeys, weaknesses, tests). Deduplicated — one definition per metric.
- Low-medium weight: text on the page background, no boxes.

### C — Act now · Priority 1 · DOMINANT — the one raised region
- **The only `shadow-card` surface on the page** (15a §4: ≤1 hero). Largest type, most padding, the accent.
- Has-active-journey: shows the most-recently-updated active journey (title + sentence) + a clear "Continue" CTA, action inline (15a §6).
- No-active-journey: a Study-first prompt ("find a weakness to work on").
- Secondary actions sit **below**, visibly smaller (the non-primary of Study/Journeys + Log experience). They must not read as co-equal to the hero — the old PATH 01/PATH 02 twin-giants problem.
- **Drop "PATH 01 / 02" numbering** (implied a sequence; they're parallel).

### D — Suggestions · Priority 3 · low-density scannable list
- Tight rows, not full-width banners: title + one-line subtitle + **inline** "Start journey" on the same row.
- Show ~3 with "see all". Metadata (weakness/score) legible but quiet.

### E — Platform stats · Priority 3 · quiet bottom strip
- **Kept** (product decision) but **demoted**: moved out of the prime top-right rail to a quiet strip at the page bottom. Compact, low contrast — present for those who care, not competing with personal content. Never lead with a zero (15a-adjacent): zero-state values render as "—"/neutral, not a demoralizing "0".

## Acceptance (15a review checklist applies)
1. One page-title size; ≤1 raised region (the hero). 2. No metric appears twice. 3. Obvious weight gap between Zone C and Zone D. 4. A first-timer can name the single next action in <3s. 5. No sub-11px readable text; headings not bold.
