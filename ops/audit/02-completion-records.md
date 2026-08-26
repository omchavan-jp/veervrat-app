# Audit 02 — Are the completion records true?

**Run 2026-08-27.** Third of five passes.

**Why this pass exists.** This project holds **110 markdown documents** — 42 in `spec/`, 39
archived openspec changes, 22 in `documentation/`, 7 in `ops/`. It does not have a documentation
shortage. The question is whether what they claim is true, because `CLAUDE.md` records three
occasions when it was not: `O16` read "built + proven" while the migration job had never applied a
migration anywhere; `ui-ux-remediation` 1.15 was ticked and absent from the code; #40 sat open
while shipped and deployed.

**The headline: the records are in better shape than that history suggests.** Of 1,153
mechanically checkable claims, **one** tick had to be reversed. That is worth saying plainly
rather than manufacturing alarm — but the one that failed, failed in an instructive way.

---

## 1. Method

`- [x]` lines across **50** `tasks.md` files (active and archived) hold **2,138** ticks. Most are
prose and unfalsifiable. Some name a concrete artifact — a file path, a source identifier, an HTTP
route — and those can be checked mechanically.

A script extracts every backticked token from a ticked line, classifies it (path / identifier /
route), and checks whether it exists in the repository. Output is JSON, so this is **regenerable
after every change** rather than a narrative that ages.

Script: `scratchpad/verify_ticks.py` (not committed — it is a one-shot instrument; if this becomes
routine it belongs in `scripts/`).

> **The first run reported 123 misses. 90 of them were the script's fault**, not the documents' —
> it only searched source directories, so every citation of `design.md`, `CHANGELOG.md` or
> `ops/data-map.md` looked missing. Corrected to check the whole repository. Recording this
> because an audit that reports its own blind spots as findings is worse than no audit: the rule
> *an empty result is not a pass* cuts both ways.

**After correction: 1,153 claims checked, 33 misses.**

---

## 2. The 30 archived misses are rename drift, not false completion

Archived changes cite names that have since changed. Every one checked resolves to a rename or a
deliberate removal:

| Cited | Reality |
|---|---|
| `RESEND_API_KEY` | Resend was replaced by SMTP (`2026-08-17-smtp-email-transport`) |
| `ThrottlerStorageService` | now `ThrottlerStorageRedisService` |
| `SessionAuthGuard` | now `SessionGuard` |
| `documentation/Platform-Engineering-Standard.md` | now `10_Platform-Engineering-Standard.md` |

**These were not un-ticked.** An archived change describes what was true when it shipped. Rewriting
it to match today's names would destroy the record it exists to keep. The drift is expected and
harmless; it is only a problem if someone reads an archived change as current.

---

## 3. The three active misses

### 3.1 `SCORE_LABELS` — honest, absent *because* the work was done

The tick reads "move all hardcoded EN/MR literals … centralize the 3 `SCORE_LABELS` maps into one
`t()` helper". The identifier is gone and the labels are in `messages/en.json` as
`study.report.score.1–4`. **Absence is the evidence of completion.** No change.

### 3.2 `AlertDialog` — the work was done, the wording named a component that never existed

Task 3.4 claimed "`Dialog`/`AlertDialog` for the exit-confirm + delete-account modals". No
`AlertDialog` component was ever built. But `settings/page.tsx:881` does use the `Dialog`
primitive for the delete-account confirm, focus-trapped and keyboard-navigable.

**Tick stands; wording corrected** so the claim is checkable. A claim naming an artifact that does
not exist is unverifiable even when the underlying work is real.

### 3.3 `UI_DEFECTS.md` — the only tick reversed, and the most instructive

`ui-ux-remediation` opens:

> Defect IDs (**D001–D453**, B001–B005, RC01–RC13) refer to
> `/Users/omc1/Documents/om/jp/veervrat/ui-audit/UI_DEFECTS.md`.

That file **does not exist anywhere on disk.** Nor does the deferred list
`ui-audit/sweep-deferred.json` cited alongside it. Both were:

1. at an **absolute path outside the repository**, and
2. under `om/jp/`, a directory tree the project has since moved out of.

**Consequence: not one defect ID in that change can be resolved by anyone.** "D207 fixed" is
neither verifiable nor falsifiable. The change describes ~250 fixes against a register nobody can
read.

Task **5.4 has been un-ticked** — "Browser re-walk at 375/768/1440: confirm B001, B002 … tick
fixed defects in `UI_DEFECTS.md`". Not because the re-walk did not happen; it probably did. Because
its entire result was recorded in a file that no longer exists. **A tick whose evidence cannot be
produced is a claim, not a record.**

This is exactly the risk `CLAUDE.md` names about untracked working files — *"every infrastructure
decision was one bad edit or dead disk away from gone"* — realised. The `ops/` directory was moved
into git for this reason on 2026-08-16. The UI audit was not.

---

## 4. The verification claims — checked, and they held

Mechanical checks cannot see prose, and prose is where the known failures lived ("proven",
"verified"). So a second pass looked at every **active** tick asserting verification, deployment or
proof. Eleven. The two that could be checked from here:

### `capability-grants` 8.1 — suspected unsound, and it is not

The tick reads "Grant `FEEDBACK_WIDGET` to a test user on UAT, confirm the widget appears". This
looked like a textbook confounded check: `CLAUDE.md`'s own worked example records that UAT ran
`feedback_mode = all`, which shows the widget to **everyone regardless of grant** — so the check
could not have distinguished "the grant works" from "the grant is irrelevant".

**The dates say otherwise.** UAT was changed from `all` to `granted` in `c3fd199` on
**2026-08-21**. The verification is dated **2026-08-22** — after the fix, with UAT mirroring prod.
And 8.2 additionally checked that revoking made the **API return 403**, which no web-tier config
could fake.

**Sound. No change.** Recorded at length because the hypothesis was wrong and checking it cost ten
minutes; asserting it would have put a false accusation into the permanent record.

### `upload-visibility` 8.1 — a dated observation, now stale

"Prod's storage account is deployed and still unexercised (2026-08-24)." True when written; prod
storage has since been exercised manually. Annotated with the update rather than rewritten — this
section exists to *record* things, and a record that silently updates itself is not a record.

### The three failures `CLAUDE.md` cites are all corrected

| | Status |
|---|---|
| `O16` | Corrected 2026-08-21 with a full account of how a "Succeeded" job migrated nothing for five days. **Exemplary** — it explains the mechanism, not just the outcome |
| `ui-ux` 1.15 | Un-ticked, with the reason and the file that proves it |
| #40 | Closed 2026-08-21 |

---

## 5. What this pass changed

- `ui-ux-remediation/tasks.md` — header warning that the defect register is gone and no defect ID
  resolves; **5.4 un-ticked**; 3.4 wording corrected to name a component that exists.
- `upload-visibility/tasks.md` — 8.1 annotated with its current status.
- `ops/PROJECT-STATUS.md` — **new thread O18**, from audit 01: a real account password committed
  to the repository in `258395a`. Removed from the working tree, still in history. Marked *now,
  not cutover*.

---

## 6. What this pass did NOT establish

- **~985 prose ticks were not checked**, because nothing mechanical can check them. The
  verification-claiming subset was reviewed by hand; the rest — "sweep complete", "wired",
  "tested" — remain claims.
- **Nine of the eleven verification claims could not be re-checked from here** — they assert
  things observed on UAT with accounts and state that no longer exist. They are not disputed;
  they are unverifiable from this seat, which is a different thing and should not be recorded as
  either.
- **The archived corpus was not read.** 39 archived changes and 935 ticks were checked only
  mechanically.
- **Nothing here says the *work* is right** — only that the records describe artifacts that exist.
  A tick can name a real file containing the wrong code. That is audit 03's question.

---

## 7. The durable lesson

One tick failed, and it failed because **its evidence lived outside version control**. Everything
else that looked wrong turned out to be either a rename or my own blind spot.

So the rule this pass earns is narrow and specific, and it is not "the documents are lying":

> **A completion record may only cite evidence that lives in the repository.** An absolute path, a
> file on someone's disk, or a register in another directory tree is not evidence — it is a
> promise that someone still has the file. `UI_DEFECTS.md` was that promise for 453 defects, and
> it was not kept.
