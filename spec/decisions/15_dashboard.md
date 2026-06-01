# VA Dashboard Stats & Path Cards
_Last updated: 2026-06-01 | Round: R1_

## Confirmed Decisions

### Stats Bar (personal, always visible on dashboard)
Shows hybrid activity + progress stats:
- Weaknesses explored
- Tests taken
- Journeys active · Journeys completed
- Exposures active · Resolutions active · Challenges active
- Exposures completed · Resolutions completed · Challenges completed

### Path Card 01 — Study Your Weakness
Weakness-centric view:
- Weaknesses explored (browsed/tested at least once)
- Weaknesses with at least one test taken
- Weaknesses with an active journey

### Path Card 02 — Work on Your Weakness
Combined journey + ERC view:
- Journeys active · Journeys completed
- Exposures active · Resolutions active · Challenges completed

### Weakness Prioritisation
Both derived and manual:
- **Derived "explored"** — any weakness where at least one test has been taken counts as explored.
- **Manual pin** — VA can optionally mark specific weaknesses as focus/priority. These appear prominently in the Study path.

### Test State Model (draft model)
- A test can be: **not started**, **draft** (started, partially answered, saved), or **completed**.
- Mid-test exit → prompt: "Save as draft" or "Discard."
- Draft = partial answers saved, resumable from where left off.
- Submit → score preview shown → VA confirms submission or returns to test.
- "Tests in progress" is replaced by "Tests saved as drafts" in all stats and UI labels.
- Drafts are private — not visible to VM or anyone else.

### Experience Log Draft Model
- Same draft model applied to global experience log entries.
- Mid-entry exit → "Save as draft" or "Discard."
- Drafts are always **Only me** until published.
- On publish: VA sets visibility tier (Only me / Friends / Public).

- **Weakness pins:** unlimited — no cap.
- **Draft test expiry:** no expiry. VA can be periodically prompted to review old drafts (e.g. "You have a draft from 30 days ago — submit, continue, or discard?"). Prompt is gentle, not blocking.

## Open Questions (area-specific)
- Score preview on test submission — exact format TBD (implementation detail)
