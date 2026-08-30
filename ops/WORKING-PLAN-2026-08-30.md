# Working plan — 2026-08-30

Supersedes `WORKING-PLAN-2026-08-22`, `-08-25` and `-08-27`, which live in the parent folder
outside git. **This one is in `ops/` on purpose** — the root `CLAUDE.md` records that project
documentation moved into the repo on 2026-08-16 so it gains version history, diffs and backup,
because untracked files were "one bad edit or dead disk away from gone". A new plan written to the
parent folder would be the exact thing that move corrected. The three older plans are still out
there and should follow.

---

## Where the project actually is

**The working order in `PROJECT-STATUS.md` is finished.** Items 1–19 are all complete, so for the
first time the sequence does not say what happens next — the next step is a judgement among open
issues rather than a queue position. That is a change in kind, not a milestone, and it is why this
document exists.

What that leaves:

| | |
|---|---|
| Open issues | 32 of the 75 named across the three prior plans |
| Open OpenSpec tasks | 28, across 8 changes |
| Genuine beta blockers | **3** — and two of them are not code |

### The three prior plans, reconciled

| Plan | State |
|---|---|
| **08-22** | Track 0 (record hygiene) complete. Tracks 1–5 partial — legal, continuity and post-tester tracks largely open |
| **08-25** — nine "must fix before testers" | **5 done**: #22+#193, #194, #131, #196, #189. **1 effectively done**: #93 — the hard stop shipped; only the card swap remains. **3 open**: #154, #136, and exercising the production upload path |
| **08-27** | Batches 1, 3, 3b complete. Batch 2 partial — 2 of 7 closed (`received-invitations`, `server-resolved-auth`, both archived 2026-08-30); 5 need manual UAT verification. Batches 4–7 largely open |

---

## Decisions taken 2026-08-30

These are recorded here because each closes a question that was open in a prior plan, and a
deferral that is not written down reads as neglect later.

| | Decision | Consequence |
|---|---|---|
| **#92** cold start | **Deferred.** prod stays scale-to-zero | Nobody is on prod, so a 5–20s cold start costs nothing today. Trigger: the beta invitation — Om will say when. ⚠️ prod is the *cold* environment and UAT the warm one, which is the wrong way round the moment a tester arrives |
| **#93** spending cap | **Deferred — the remaining half only.** The runbook shipped 2026-08-26 | What is left is swapping a personal MasterCard for a JP institutional one: an organisational conversation. Safe to defer, not safe to forget — the runbook caps a *spike*, not the month, and cannot act on a slow drift below ₹13,000 |
| **#267** off-site backup | **Deferred, labelled as a standing fact** | Not neglected work. Trigger: go-live, or prod carrying data anyone would miss |
| **#84** budget proposal | **Deferred** | Wants a cost figure that does not exist yet |
| **#154** Marathi review | **Do now.** Nine interface strings folded into the pack (PR #273) | Longest lead time of anything remaining; it finishes on somebody else's clock |
| Prod tag | **Cut `prod-2026-08-30`** | 61 commits, six migrations. Also creates prod's backup storage and job — production had no off-Azure copy at all until this |

---

## Sequence

Ordered by **whose clock it runs on**, not by size. Anything that finishes on someone else's time
starts first, because nothing we do afterwards makes it arrive sooner.

### 1. Hand off what other people have to do

- **#154 — send the pack to Nachiket Nitsure.** Ready once PR #273 merges. 64 policy blocks plus
  9 interface strings, every Marathi string verified byte-identical to `apps/web/messages/mr.json`.
- **#93 — raise the card swap with Ashutosh.** One conversation.

### 2. The UAT verification batch

Five OpenSpec changes are blocked on manual browser work and nothing else. One session closes four
of them outright.

| Change | Tasks | Note |
|---|---|---|
| `content-suggestions` | 7.1–7.4 | |
| `experience-log-view` | 5.1 (+2.3 routing) | |
| `ui-ux-remediation` | 5.3, 5.4 | 5.3 needs the full docker stack |
| `upload-visibility` | 0.1, 0.2 | Design-doc reads, not deploy work |
| `age-gate-and-consent` | 9.1–9.3 | ⚠️ **Destructive — deletes all users in both environments.** Approved by Om 2026-08-30 |

### 3. Exercise the production upload path — once

Item 9 of the 08-25 plan, never done. Uploads were proven on **UAT** on 2026-08-24 (O15/#139:
real upload, byte-identical read-back); production has never been exercised.

⚠️ **This cannot be checked from a laptop.** Nobody here holds a data-plane role on
`veervratproduploads` — Terraform grants humans `Storage Blob Data Reader` on the *backups*
accounts only — and prod's Postgres allows Azure services alone. It needs a person to upload an
image on prod and look at the result.

It was previously blocked by #75 (no way to delete a prod test account). `prod-2026-08-30` carries
self-delete, so that blocker is gone — a tester can now remove their own account afterwards.

⚠️ **Revised 2026-08-30: the write half has already run on prod, and nobody recorded it.** Prod's
`uploads` table holds one row — `purpose=experience`, a `.jpg`, created **2026-08-25 11:00**, the
day after the plan that lists this as pending. So what remains is narrower than "exercise the
upload path": it is the **read-back**.

And that half resists checking from here in a way worth writing down. Fetching that image as a
guest returns 404 — but so does a **deliberately invented key**, because a guest is not permitted
to see it either way. `data-map.md` records this as the designed behaviour ("uploader 200,
anonymous 404"). So the guest-level check cannot distinguish a present blob from an absent one,
and reporting its 404 as evidence either way would be wrong. Proving it needs a signed-in session
that owns the containing log, or a blob data-plane role nobody currently holds.

### 4. #136 — breach and lawful-request procedure

The last of the 08-25 must-fixes that is still code-adjacent work. Draftable here, reviewed by Om.

### 5. Only then

`my-vratmitras-chat` is the largest remaining block (13 open) and is **not** a beta blocker — O8
defers chat to >1 replica and it has never run in production. Batches 4–7 of the 08-27 plan
(#24, #116, #125 UX; #38, #39 content) are post-tester by those plans' own reckoning.

---

## What would make this plan wrong

Written down so the next reader can check rather than assume:

- **If prod acquires real users before #92 is revisited**, the deferral above stops being free —
  every one of them meets a 5–20s cold start.
- **If the Marathi review comes back with material corrections**, the policy version bumps and
  everyone who accepted the earlier text is re-prompted. That is the mechanism working, but it is
  not a small event, and it lands on whatever else is in flight.
- **If `age-gate-and-consent` 9.1 runs**, both environments lose all users. Everything downstream
  that assumed an existing account — including the UAT verification batch above — has to be
  re-seeded. Sequence 9.1 last within step 2, not first.
