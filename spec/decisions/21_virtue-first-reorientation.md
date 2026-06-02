# Virtue-First Reorientation
_Last updated: 2026-06-02 | Round: R1_

## Philosophy

Veervrat is "sadgunachi upasana" — the pursuit and worship of virtues. Weaknesses are the diagnostic lens that reveals where virtues need to be cultivated, not the destination. The app must reflect this: weaknesses are *how you find* what to work on; virtues are *what you are working toward*.

This does not change the data model structure — it changes the primary framing and display priority throughout the app.

---

## Confirmed Decisions

### Test Flow & Result Screen
- Entry: "Study your weakness" — label stays. A "Why study weaknesses?" modal is accessible from this section, explaining the philosophy: studying weaknesses is the path to identifying which virtues to cultivate; "sadgunachi upasana" and its meaning.
- The test result screen primarily surfaces: **suggested sentences to work on** (flagged Sometimes/Never).
- Cumulatively, the result screen also shows: **virtues and subvirtues to work on** — derived from the sentences' subvirtue mappings. This is the virtue-first pivot: the result tells the VA which virtues the suggested sentences relate to.
- "Study your weakness" path card retains its name. A subtext or info link explains the philosophical connection to virtue cultivation.

### Journey Interior
- The sentence's **subvirtue and virtue** are prominently displayed inside the journey — not just at the journey start but throughout (header or consistent label).
- Journey context: "Working on [sentence] — cultivating [subvirtue] → [virtue]."

### ERC Tagging
- ERC items (exposures, resolutions, challenges) show virtue/subvirtue tags **first** in the display order.
- Weakness tags are retained and shown, but as secondary/contextual.
- When adding or editing an ERC item, virtue/subvirtue tag is shown first in the tag UI (not required — all tags remain optional). Weakness tag is shown below.

### Dashboard Stats
- Primary stat: **virtues/subvirtues being cultivated** (derived from active journeys' sentence → subvirtue → virtue chain).
- "Weaknesses explored" moves to secondary — accessible as a drill-down or secondary stat, not the headline.
- Path card 01 ("Study your weakness"): subtext or info link explaining that studying weaknesses leads to identifying virtues to work on.

### Shloka & Resource Tags
- Display order: virtue/subvirtue tags shown first, weakness tags shown below.
- No change to which tags are required (all optional).

### Virtues & Weaknesses Browser (new page)
A dedicated browsable reference page — accessible from nav.

**Virtues section:**
- Browse all virtues.
- Clicking a virtue → **Virtue detail page/modal:** virtue name (EN + Devanagari), description, list of subvirtues (each clickable).
- Clicking a subvirtue → **Subvirtue detail page/modal:**
  - Subvirtue name (EN + Devanagari), description
  - Parent virtue shown
  - Weaknesses this subvirtue helps tackle — displayed as clickable buttons (each navigates to the weakness detail)
  - Sentences of this subvirtue — browseable list (each clickable)
- Clicking a sentence → **Sentence info page/modal (view only):**
  - Sentence text (EN + Marathi)
  - Subvirtue and virtue it belongs to
  - Active journey indicator if VA has an active journey for this sentence
  - **No "Start journey" CTA here** — sentence is informational only from this entry point
  - CTAs available:
    - "Take a test" — goes to weakness selection (choose from weaknesses that use this sentence's subvirtue), then takes the test, then result screen where journey can be started normally
    - "Choose a weakness to explore" — shows which weaknesses include this subvirtue, VA selects one → takes that weakness's test → result screen

**Weaknesses section:**
- Browse all weaknesses. Each weakness opens a detail view:
  - Weakness name (EN + Devanagari)
  - Description and what this weakness looks like behaviorally
  - "Cultivating the following virtues/subvirtues can help you tackle this weakness" — list of linked subvirtues (each clickable, navigates to subvirtue detail)
  - CTA: "Take the test for this weakness"

**Journey start rule:** Journeys can only be started from the test result screen or from the Flow 2 sentence suggestion list. The Virtues browser is informational — all paths from it route through a test before a journey can be started.

**Access:** Accessible to guests (browse only — no test or journey CTAs). VAs see their journey/test status overlaid (e.g. sentence shows active journey indicator).

**"Why study weaknesses?" Modal**
- Accessible from: Study path card, the weakness browser, the test entry screen.
- Explains: why studying weaknesses is the path to identifying virtues; what "sadgunachi upasana" means; how the test → sentence → subvirtue → virtue chain works.
- Authored and managed by admin.

## Spec Files to Update
The following existing spec files need minor updates to reflect virtue-first display priority (no structural changes — framing and display order only):
- `03_flows.md` — result screen framing
- `15_dashboard.md` — stats bar primary/secondary reorder
- `16_content-pages.md` — shloka/resource tag display order
- `02_data-model.md` — note virtue/subvirtue as primary display tag

## Open Questions (area-specific)
- Virtues & Weaknesses browser: **dedicated page** for virtue/weakness detail (confirmed — depth of content requires full page, not modal)
- Nav placement — TBD during implementation (sidebar nav, likely under Study path)
- "Why study weaknesses?" modal — standalone modal, separate from "What is Veervrat" page. Accessible as a contextual explainer.

## Flags
- ⚠ Virtue-first is a display/framing change, not a data model change. ERC weakness tags remain in the DB; they are not removed or demoted in schema — only in display priority.
- ⚠ Virtues & Weaknesses browser is a new page not previously specced — add to nav and routing before implementation.
