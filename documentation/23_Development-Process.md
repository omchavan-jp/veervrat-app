# 23 — Development Process

**How work gets from an idea or a complaint into production, for a team.**

This is the frozen process. It replaces `20_Solo-Dev-Operations.md`, which described the same
loop for one maintainer working with an agent and no reviewer — the assumption that no longer
holds and that the 2026-08-27 audit showed was load-bearing.

Two tracks, because two situations carry different risks:

| | Track A — change something that exists | Track B — build something new |
|---|---|---|
| **The risk** | You don't actually know what it does now, and changing it breaks someone else | Building the wrong thing, well |
| **First step** | Establish ground truth | Frame the problem |
| **Skipping it costs** | Regressions and cross-actor defects | Months on something nobody needed |

They share the second half deliberately. One delivery pipeline, one definition of done, one
review shape — the divergence is all upstream.

---

## 1. The shape of the work

**Continuous flow, not sprints.** There is no scrum master and there will not be one. Sprints
without someone to run planning and defend the boundary decay into a list with a date on it:
the overhead arrives, the benefit does not. So: one ordered queue, pull from the top, and two
rules that carry the whole discipline.

- **A WIP limit.** A hard cap on items in progress — roughly one per person, plus one. This is
  the entire mechanism. It is what stops five half-finished branches and it is the only rule
  here that hurts to follow.
- **A rhythm for looking.** Every second Friday, whoever finished something demos it. A calendar
  entry, not a role.

**Discovery runs one item ahead of delivery.**

```
DISCOVERY   [ shape #7 ] [ shape #6 ]        ← flows, wireframes, specs, acceptance criteria
                              │
                              ▼  only when the gates below pass
DELIVERY              [ build #5 ] [ build #4 ] [ build #3 ]   ← WIP limit
```

Nothing enters the delivery queue until discovery has produced its outputs. While the build
queue works on #5, discovery is shaping #6 and #7. Design is never "the phase before coding"
and never "catching up afterwards".

This is not new machinery. OpenSpec is already shaped this way — `proposal.md` and `design.md`
are discovery, `tasks.md` and apply are delivery. The two changes are that discovery now runs
**ahead** rather than immediately before, and that it must produce **a flow diagram and a
wireframe** for anything a person will touch.

---

## 2. Sizing — four tiers

Not everything deserves the full process. Size first; it decides how much of the track applies.

| Tier | What it is | The test | Track A | Track B |
|---|---|---|---|---|
| **0 · Fix** | A defect with one obvious correct answer | *Would two engineers write the same fix?* | A1 → A6 → A7 → A8 | — |
| **1 · Adjust** | Behaviour changes; the flow does not. Copy, validation, an error state, a missing affordance | *Does the flow diagram change?* **No** | Full, skip A4 | — |
| **2 · Change** | A new state, screen or transition appears | Flow diagram changes | Full | Full |
| **3 · New capability** | Nothing like it exists | No capability spec covers it | — | Full, from B0 |

⚠️ **Tier is a claim, and claims get checked.** "It's just a copy change" is how a tier-2 change
enters without a design. If A5's blast-radius check turns up a second actor or a second entry
point, the tier was wrong — re-size it and go back, don't push through.

---

## 3. Track A — changing something that exists

### A1 · Establish ground truth  · *anyone* · **output: an "as-is" paragraph on the issue**

The step a greenfield process does not have, and the one that matters most here.

Before proposing anything, answer: **what does it do right now?** Not from the product spec —
from these three, in this order:

1. **Walk it on UAT.** Ten minutes. This is ground truth.
2. **Read the e2e spec** for that flow (`e2e/flow-NN-*.spec.ts`) — it states the path a machine
   walks, which is usually the happy path only.
3. **Read the capability spec** in `openspec/specs/<capability>/spec.md`.

> **Any disagreement between those three is filed as its own issue, immediately, before the work
> continues.** This is the mechanism that stops documentation rot. It is not a detour — a spec
> that lies is how a correct change gets built on a false premise. Four such drifts were found in
> `openspec/specs/auth/spec.md` alone on 2026-09-08.

**Do not read the implementation to establish behaviour.** Code tells you what it does, not what
a person experiences, and reading it first anchors you to the current design.

### A2 · Size  · *anyone* · **output: a tier label on the issue**

Per §2.

### A3 · Decide  · *product owner* · **output: a line on the issue, or a decision doc**  · tier 1+

Is the current behaviour **wrong**, or merely **different from what someone expected**? These
need different answers and only one of them is a defect.

`AGENTS.md` → "Whose decision is it" governs: implementation is the builder's, policy is the
product owner's, and the test is whether the owner would be surprised to learn it was decided
without them. If the answer changes what users may do, see, or are asked for — it is not the
implementer's call.

Substantial answers become a decision document (`24_Documentation-Standard.md` §3, class
**DECISION**), not a comment that disappears into an issue thread.

### A4 · Design  · *whoever is shaping* · **output: flow diagram + wireframes**  · tier 2 only

Update the flow diagram; draw the screens that change. Low fidelity. Committed to
`openspec/changes/<name>/design/` as PNG or SVG alongside the source file.

**Run the gap grammar (§5) over the changed flow.** This is where judgment coverage comes from.

### A5 · Spec the delta  · *builder* · **output: `openspec/changes/<name>/`**

`/opsx:propose` after the mandatory research phase in `AGENTS.md`.

⚠️ **Blast radius is a required section of `design.md`.** Four questions, answered explicitly:

1. **Which other roles touch this?** Vratarthi, vratmitra, moderator, admin, guest — what does
   each see after the change?
2. **What else enters this screen?** Deep links, notification destinations, email links,
   bookmarks, the back button.
3. **What does this invalidate?** Sessions, cached queries, in-flight invitations, pending
   approvals, unread notifications.
4. **What existing tests assert the old behaviour?** They must be updated deliberately, and the
   update reviewed — never adjusted until green.

This is the only step that catches cross-actor defects. Walking the app cannot find them,
because using the app is inherently single-actor. The audit's three worst defects — the ones
that made core flows impossible — were all of this kind.

### A6 · Build  · *builder* · **output: a PR**

`/opsx:apply`. Tests written alongside the code, never after. Auth matrix: one positive and one
negative test per permission row the change touches. `pnpm test` green before apply is done.

### A7 · Review  · *someone who did not build it* · **output: review + a walked flow**

Two parts, both required:

- **Before merge:** `/code-review` on the diff, maintainer approval and required CI/integration/E2E
  checks against current main. New changes invalidate stale approval.
- **After merge, before production:** walk the deployed flow on UAT and record the release
  acceptance. UAT receives main after merge; do not demand a pre-merge UAT deployment.

`omchavan-jp` reviews other developers' changes. Maintainer-authored PRs use the explicitly agreed
self-review exception; it never waives PRs or required checks. Authority and implementation
status: [governance policy](25_Git-and-Release-Governance.md) and
[rollout status](../ops/github-governance-status.md).

The second part is the change that this whole document exists to make. See §6.

### A8 · Close out  · *builder* · **output: updated spec, CHANGELOG, closed issue**

`/opsx:archive` — which updates `openspec/specs/`, and is the reason that directory stayed
current while `spec/decisions/` froze. Then CHANGELOG, then close the issue **with what was
observed on UAT**, not the word "done".

---

## 4. Track B — building something new

### B0 · Frame  · *product owner* · **output: one paragraph**

Before anything else, four sentences:

- Who has this problem?
- What do they do today instead?
- What changes if it works?
- **How will we know?**

If the last one has no answer, it is not ready to shape. That question is what lets a feature be
argued *out* of scope later, and without it every proposal is equally good.

This is the discipline of a product brief, applied per feature. Done this way it costs fifteen
minutes and never goes stale, which is the opposite of what happened to the standalone product
briefs deleted on 2026-08-16.

### B1 · Check the ledger  · *anyone* · **output: a link, or "not found"**

Is it already decided, deferred, or deliberately excluded?

- `spec/decisions/08_out-of-scope.md`
- `documentation/05_Deferral-Ledger.md`
- `spec/open/questions.md` and `spec/open/deferred.md`
- `spec/adr/` — an ADR may already forbid the shape you have in mind

Five minutes, skipped most often, and the cheapest step in this document.

### B2 · Load the constraints  · *whoever is shaping* · **output: none — this is reading**

Roughly two hours, once per person, refreshed when shaping anything unfamiliar:

`spec/CONTEXT.md` · the 8 ADRs · `spec/decisions/05_permissions.md` ·
`documentation/10_Platform-Engineering-Standard.md` · `documentation/15_Design-System.md` and
`15a_UI-Consistency-Rules.md`

⚠️ **Shape blind to the implementation, never blind to the decisions.** Not looking at the
current app is deliberate and useful — it prevents ratifying what exists merely because it
exists. Not knowing the *decisions* is neither: it produces designs that violate settled
positions, and the argument is then re-run from scratch. Someone who has not read
`spec/decisions/21_age-and-personal-attributes.md` will put an age on the public profile, which
was decided against, in writing, for a reason that took a page.

### B3 · Shape  · *whoever is shaping + product owner* · **output: flow diagram + wireframes**

Journey and flow diagram first; low-fidelity wireframes in parallel. They inform each other —
the flow says what states a person can be in, the wireframe says what they see.

**Unit of work is the flow, not the screen.** Screens are an output. Twelve to fifteen flows
cover this product; seventy-four screens is the same coverage at five times the meetings.

**Run the gap grammar (§5) as you draw**, not afterwards. Applied during shaping it produces a
better design; applied afterwards it produces a list of complaints.

Stop when the flow stops changing shape. Go to high fidelity only if there is a reason to.

### B4 · Resolve the open questions  · *product owner* · **output: answers or logged deferrals**

Every question shaping raised gets an answer, or an explicit deferral recorded in
`05_Deferral-Ledger.md` **with the item that pays it back**. A new architectural choice becomes
an ADR in `spec/adr/`.

An unanswered question that reaches the builder becomes an invented answer. That is the
mechanism this step exists to prevent.

### B5 · Spec  · *builder* · **output: `openspec/changes/<name>/`**

`/opsx:propose` — proposal, design, capability specs with Given/When/Then scenarios, tasks.
Blast radius per A5 applies here too: new capabilities have a smaller radius, never zero.

### B6 – B8

Identical to A6 – A8.

---

## 5. The gap grammar

Nine questions, run per flow, during design. Each one is here because a defect of that exact
shape has already happened in this codebase — which is why these and not a generic checklist.

| # | Question | Where it came from |
|---|---|---|
| 1 | **Entry** — every way in. Deep link, bookmark, back button, email link, notification | Notification bell links pointed at the sender's page |
| 2 | **Empty** — nothing exists yet. Does that read as an invitation or as a failure? | The my-vratmitras empty state |
| 3 | **Error, and can you recover *from here*** — not "is there a message", but "is the fix reachable from this screen" | #96 — the only route to a resend was to attempt a login first |
| 4 | **Partial success** — step 2 of 3 failed. What is the person told, and what state is the data in? | #141 — account created, email never sent, person told signup failed |
| 5 | **Repeat** — do it twice. Come back tomorrow. Refresh mid-flow | #160 — the resend worked exactly once |
| 6 | **Second actor** — who else is affected, what do they see, and when? | Removing a vratmitra left them reading your journeys |
| 7 | **Every role** — vratarthi, vratmitra, moderator, admin, guest | The permission matrix exists; the screens did not always honour it |
| 8 | **Time** — what is this in ninety days? Expired, archived, purged, or still here? | Notification retention, still open in `spec/open/questions.md` |
| 9 | **Both languages** — does the Marathi exist, and does it fit? | `mr.json` parity, and Devanagari line-height |

**Why a checklist rather than better requirements.** Judgment does not scale by writing more
prose — an omission cannot be found by re-reading the document that omits it. It scales by
**forced enumeration**, which converts judgment into recall, and recall is coverable. The
2026-08-27 audit found eight defects not by specifying harder but by sweeping systematically and
asking, of every capability, whether it had a surface.

---

## 6. Definition of Done

Six conditions. All of them, every time, tier 0 included.

1. `pnpm test` passes — unit and integration.
2. The capability spec in `openspec/specs/` matches what was built.
3. Deployed to UAT and healthy.
4. **The maintainer walked the flow on UAT**, independently for other developers' work;
   maintainer-authored work uses the documented self-review exception. Record observed evidence.
5. The issue is closed with **what was observed**, not the word "done".
6. CHANGELOG updated.

**Condition 4 is the point of this document.** The audit's diagnosis was one sentence and it
held in every case: *"the backend was built, tested and correct, and the thing a person touches
was missing, inert, or pointed somewhere useless."* The working definition of done had become
*the API can do it*. Eight defects, three of which made core flows impossible for every real
user, all invisible to a green test suite.

Independent walkthrough remains the normal rule for another developer's work. The owner has
accepted the temporary self-review exception for their own work; do not describe that exception
as independent verification or waive the remaining conditions.

---

## 7. Decision rights

| Decision | Whose |
|---|---|
| How something is implemented — structure, naming, libraries within the approved catalog | Builder |
| Whether the current behaviour is wrong | Product owner |
| What a person may do, see, or is asked for | Product owner |
| What a screen looks like within the design system | Whoever is shaping |
| Changing the design system itself | Product owner |
| Adding a dependency | Product owner — `10_Platform-Engineering-Standard.md` is a hard gate |
| Priority and sequence | Product owner |
| Whether it is done | Maintainer, per §6 and the explicit maintainer self-review exception |

The test when unsure, unchanged from `AGENTS.md`: **would the product owner be surprised to
learn this was decided without them?** Announcing a decision is not making it jointly — it
still leaves someone else to catch it.

---

## 8. What this replaces

- **`20_Solo-Dev-Operations.md`** — superseded. Its capture loop (feedback widget → GitHub
  Issues → labelled and prioritised) survives intact and is still correct; its implementation
  loop assumed one person and no reviewer.
- **`AGENTS.md` §"Implementation SOP"** — still correct for an agent working alone on a
  well-specified item. This document is the human process around it, and A1 and A7 are additions
  the SOP does not have.

Delivery authority: [Git and Release Governance](25_Git-and-Release-Governance.md), with short
reminders in `AGENTS.md`. Unchanged: the OpenSpec
commands, `04_Implementation-Cautions-and-Principles.md`, and the hard rules in `AGENTS.md`.
