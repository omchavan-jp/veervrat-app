# 24 — Documentation Standard

**What a document is for, what keeps it true, and how to clean up without breaking things.**

There are **495** markdown files in this repository; **217** outside the OpenSpec archive. That
is not the problem. The problem is that four kinds of document with four different lifecycles
live in the same folders, look identical, and are all presented as current.

---

## 1. The evidence — how documents rot here

Measured 2026-09-08.

| Directory | Files | Last touched | What it actually is |
|---|---|---|---|
| `spec/decisions/` | 28 | **19 frozen since June** | Output of decision rounds R1–R6 — a **record** |
| `openspec/specs/` | 92 | maintained per change | Current capability behaviour — the **live spec** |
| `documentation/` | 22 | 16 touched in August | Engineering rules — **live** |
| `ops/` | 10 | live | Current state — **live** |

**Twenty-three OpenSpec changes were archived from July onward**, altering the system underneath
`spec/decisions/` while it did not move. `spec/SPEC_INDEX.md` still reads *"Last updated:
2026-06-01"* with every area marked **✅ Confirmed**, and `AGENTS.md` cites `spec/decisions/` as
authoritative in **ten places** — including *"implement exactly what is there"* (line 155) and
*"never invent behaviour not described in `spec/decisions/`"* (line 460).

So everyone, human and agent, is instructed to treat a June snapshot as current law.

**That is the drift engine, and it is not a discipline failure.** Nobody forgot to update
anything. There are two spec systems, both authoritative-looking, and no rule saying which wins
for which question. Observed consequences:

| Document says | Reality |
|---|---|
| Signup collects "DOB (optional)" — `27_screen-specs.md:17` | DOB required, gated at 18+ before the account exists |
| `UserRole: USER, MENTOR, MODERATOR, ADMIN` — `openspec/specs/auth/spec.md` | `enum Role { VRATARTHI, VRATMITRA, MODERATOR, ADMIN }` — and *mentor* is a word `CONTEXT.md` bans |
| `/auth/register` takes 5 fields | It also requires `dob` and `consents[]` |
| "Not yet implemented: re-authentication" | Built, archived, and deployed on 2026-09-04 |

⚠️ **A stale document is worse than a missing one.** A missing document sends you to the code.
A stale one sends you into a change built on a false premise, confidently.

---

## 2. Classify by lifecycle, not by topic

The folders are organised by subject — spec, documentation, ops. Subject does not predict how a
document fails. Lifecycle does. Every document is exactly one of four classes, plus a fifth
thing that is not a document at all.

| Class | Lifetime | Fails by | The rule |
|---|---|---|---|
| **RULE** | Until deliberately changed | Being contradicted by newer practice nobody wrote down | Named enforcer; a violation either updates the rule or is rejected — never both |
| **DECISION** | Forever | Being edited in place, destroying the record of what was chosen when | **Never edit. Supersede**, with a link back |
| **STATE** | Until reality moves | Silent staleness | One owner + a **refresh trigger**; header carries *last verified*, not *last updated* |
| **RECORD** | Forever, frozen | Being read as current | Banner at the top; never updated; lives under an archive path |
| *(SCRATCH)* | The task | Being committed | **Never committed.** `.gitignore` or the scratchpad |

### Where the current files land

**RULE** — `AGENTS.md`, `documentation/10`–`19`, `21`, `23`, `24`, `04_Implementation-Cautions`

**DECISION** — `spec/adr/0001`–`0008`, `documentation/14_Auth-Architecture-Decision.md`,
`spec/decisions/21_age-and-personal-attributes.md`, and — once reclassified — the rest of
`spec/decisions/`

**STATE** — `ops/PROJECT-STATUS.md`, `ops/azure-account-facts.md`,
`documentation/01_System-Decisions-and-Status.md`, `DEPLOYMENT.md`, `openspec/specs/*`,
`documentation/05_Deferral-Ledger.md`, `spec/open/*`

**RECORD** — `documentation/90`, `91`, `documentation/03_Implementation-Order.md`, `ops/audit/*`,
`spec/AUDIT.md`, `ops/navigation-survey.md`, `ops/triage-archive.md`,
`openspec/changes/archive/*`, `CHANGELOG.md`

**SCRATCH, currently committed by mistake** — `GATES.md`, `PUSH_INSTRUCTIONS.md`,
`ops/WORKING-PLAN-2026-08-30.md`. (`.unlazy/` is already correctly ignored.)

---

## 3. The three questions

Before writing a document, and for every document in a cleanup:

1. **Who reads this, and at what moment?** Name the trigger — *"a new engineer on day one"*,
   *"anyone touching `infra/`"*, *"whoever is on call at 3am"*. **If you cannot name the moment,
   delete it.** Most sprawl is documents written for the writer.
2. **What breaks if it is wrong?** This sets how hard the document must be kept true. A wrong
   permission matrix ships a security defect; a wrong local-setup note costs ten minutes.
3. **What makes it wrong?** — the event that invalidates it. That is the refresh trigger.
   **A document with no trigger will rot**, and no amount of diligence prevents it.

---

## 4. The anti-drift rule

> **Never assert a code fact in prose without a check that fails when it drifts.**

A *code fact* is anything the code decides: an enum's values, an endpoint's fields, a route
list, a limit, an "implemented / not implemented" claim. Every drift in §1 is a code fact
asserted in prose.

Three options, in order of preference:

1. **Don't assert it.** Link to the file. `openspec/specs/auth/spec.md` does not need to list
   role values; it needs to point at `apps/api/prisma/schema.prisma`.
2. **Generate it.** If the list is genuinely useful in the document, generate that section from
   the source and check the result into CI.
3. **Assert it with a test.** A test that reads the markdown and the schema and fails when they
   disagree. Cheap, ugly, and it works.

This is the existing *don't quiet the alarm* principle applied to prose: when a check goes red,
fix the fact, never the check.

**Behaviour that is not yet built is a code fact too** — the "Not Yet Implemented" list is the
single most drift-prone section shape in this repository. Prefer linking to open issues, which
close on their own.

---

## 5. The cleanup — five phases, in this order

The order is the method. Phases 1 and 2 are free and remove the most files; phase 3 is the one
that pays; phase 5 is the one everyone wants to start with and is worth least.

⚠️ **Do not begin at phase 5.** Merging and splitting documents before deciding which system is
authoritative produces a smaller number of documents that still contradict each other.

### Phase 1 · Evict the scratch — *free, zero risk, ~20 files*

`git rm --cached` the three committed working artifacts and add them to `.gitignore`. Working
state has no version history worth keeping and its presence in the root implies it is a
reference.

**Gate:** `git ls-files '*.md'` contains no file whose name is a task, a date, or a set of
instructions to a past session.

### Phase 2 · Freeze the records — *cheap, ~15 files*

Every RECORD gets the banner `documentation/90` and `91` already use, and moves under an archive
path if it is not already there. `spec/AUDIT.md` and `ops/navigation-survey.md` are the clearest
cases: point-in-time findings currently sitting beside live documents.

**Gate:** every file under an archive path, or carrying a frozen banner, and no live document
links to one as though it were current.

### Phase 3 · Resolve the two spec systems — *the one that matters*

This is the whole cleanup. Everything else is tidying.

**Recommended split:**

| | `spec/decisions/` | `openspec/specs/` |
|---|---|---|
| **Class** | DECISION — frozen | STATE — live |
| **Answers** | *Why is it this way? What did we choose, and against what?* | *What does it do today?* |
| **Wins when they conflict** | Never, on behaviour | **Always, on behaviour** |
| **Edited?** | Never — superseded | Every archive |

Then:

1. Add a banner to every `spec/decisions/` file and to `SPEC_INDEX.md`: *decision record from
   round R\<n>, \<date>. Not a description of current behaviour — see `openspec/specs/`.*
2. **Rewrite the ten `AGENTS.md` references** so `spec/decisions/` is cited for rationale and
   `openspec/specs/` for behaviour. Line 155 (*"implement exactly what is there"*) and line 460
   (*"never invent behaviour not described in spec/decisions/"*) are actively harmful as written
   and are the highest-value edit in this document.
3. Fix the four known drifts in §1 — cheap now that the rule is clear.
4. `27_screen-specs.md` is the awkward one: 74 screens, part decision and part stale
   description. It becomes a RECORD, and the Track B shaping work (`23_Development-Process.md`
   §4) replaces it flow by flow with current artifacts. **Do not attempt to update it in
   place** — that is a rewrite of the whole document with no way to tell finished from
   unfinished.

**Gate:** for any behavioural question, exactly one file answers it, and `AGENTS.md` names that
file. Verify with a real question — *"is DOB required at signup?"* — and confirm the reader
reaches one answer.

### Phase 4 · Give every STATE document an owner and a trigger — *cheap, high value*

A header block on each:

```
Owner: <name> · Verified: <date> · Refresh when: <the event>
```

The trigger is an **event**, not a schedule. *"When an Azure resource is created or destroyed"*
works; *"monthly"* does not — nobody does it in month three and the document is then silently
wrong rather than obviously abandoned.

**Gate:** every STATE document has a named person, and that person knows.

### Phase 5 · Merge and split — *last, and least*

Only now, and only where two documents genuinely answer the same question for the same reader.
Suspected candidates: `15_Design-System.md` with `15a_UI-Consistency-Rules.md`;
`01_System-Decisions-and-Status.md` with `ops/PROJECT-STATUS.md`.

**Do not merge documents of different classes.** A RULE and a STATE document about the same
subject look redundant and are not — they fail differently, refresh differently, and merging
them makes both rot at the rate of the faster one.

---

## 6. Where things live

After phase 3, one line per question:

| Question | File |
|---|---|
| What does the app do today? | `openspec/specs/<capability>/spec.md` |
| Why is it built this way? | `spec/adr/` and `spec/decisions/` |
| What do the words mean? | `spec/CONTEXT.md` |
| How do I write code here? | `documentation/10`–`19` |
| How does work get done? | `documentation/23_Development-Process.md` |
| What exists in Azure? | `ops/azure-account-facts.md` |
| What is decided, open, and next? | `ops/PROJECT-STATUS.md` |
| What needs doing? | GitHub Issues |
| What happened? | `CHANGELOG.md`, `openspec/changes/archive/`, `ops/audit/` |

---

## 7. Writing a new document

Answer the three questions in §3. Then:

- **Declare the class in the first line.** RULE, DECISION, STATE or RECORD.
- **STATE** carries owner, verified date, and refresh trigger.
- **DECISION** carries the date, the alternatives rejected, and why — the rejected options are
  where the reasoning lives, and omitting them makes the decision indistinguishable from a
  preference.
- **RECORD** carries a frozen banner before anything else.
- **Assert no code fact without a check** (§4).
- Add it to `documentation/00_INDEX.md` or `spec/SPEC_INDEX.md`. **An unindexed document is one
  nobody will find and everybody will duplicate.**

If it does not fit a class, it is probably scratch, and scratch does not get committed.
