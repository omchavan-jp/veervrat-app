# Draft model for tests and experience log entries

Tests and global experience log entries support a draft state — partial completion can be saved and resumed. For tests: not_started → draft → completed. For experience logs: draft → published (with visibility set on publish).

The alternative (all-or-nothing: complete or discard) was rejected because Veervrat's content is deeply reflective. A VA spending 20 minutes on an honest test or experience log should not lose that work due to an interruption. The draft model respects the effort invested and the personal nature of the content.

Drafts are always private (Only me) until explicitly published/submitted. For tests, drafts do not expire but the VA is periodically prompted to review old drafts.

## Considered Options
- **All-or-nothing: complete or discard** — rejected: too punishing for reflective content; a VA interrupted mid-test loses meaningful work.
- **Submit-as-is (partial answers count)** — rejected: partial test results would skew the scoring and suggestion algorithm.
- **Draft model** — chosen: saves partial state, resume from exact point, publish/submit when ready.
