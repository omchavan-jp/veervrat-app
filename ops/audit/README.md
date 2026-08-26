# The 2026-08-27 audit — what it found, and what it means

Five passes, run in sequence, one file each. Every claim carries a `file:line` or is marked
unproven. **Each pass records what it did *not* establish**, because an audit that only reports
findings is indistinguishable from one that missed things.

| Pass | File | Question |
|---|---|---|
| 00 | [`00-live-threads.md`](00-live-threads.md) | Why did accepting an invitation fail on UAT? |
| 01 | [`01-e2e-runtime-pass.md`](01-e2e-runtime-pass.md) | What breaks when you actually walk the journeys? |
| 02 | [`02-completion-records.md`](02-completion-records.md) | Are the completion records true? |
| 03 | [`03-surface-audit.md`](03-surface-audit.md) | Does every capability have a surface? |
| 04 | [`04-vm-relationship-model.md`](04-vm-relationship-model.md) | Is the vratmitra relationship read correctly? |

Two checks are kept as scripts so they can be re-run instead of re-narrated:
`scripts/audit-surface-map.py` and `scripts/audit-vm-model.py`.

---

## What was actually wrong

Not "the implementation is bad". Something much more specific, and it holds in every case:

> **The backend was built, tested and correct. The thing a person touches was missing, inert, or
> pointed somewhere useless.**

| Defect | Backend | What a person got |
|---|---|---|
| Accepting a vratmitra invitation | correct, guarded, audited | **403 for every real user** |
| Inviting someone by email | invitation created, email sent | accept refused them **permanently** |
| A rejected action | precise, actionable 409 | *"Couldn't send the invitation"* — 36 sites |
| Your vratarthis | queryable | **no page existed** |
| Received invitations | — | notification links to the **sender's** page |
| Data export | complete, documented | **no button anywhere** |
| 10 notification types | email link works | bell click does **nothing** |
| Removing a vratmitra | `endedAt` set correctly | **they kept reading your journeys** |

That is a coherent diagnosis, and it points somewhere narrow: the working definition of *done* has
been **"the API can do it."**

---

## The five things worth acting on

1. 🔴 **O18 — a real password is in git history.** `e2e/auth-and-nav.spec.ts` hardcoded a personal
   account and its plaintext password from `258395a` until 2026-08-27. Removing the line does not
   remove it from history. **Rotate it.** The only finding here that cannot be fixed in code.
2. 🔴 **#217 — data export has no UI.** #135, titled *"the access and portability obligation has no
   mechanism"*, was closed with an endpoint no user can call. `ops/legal-briefing-pack.md` goes to
   a lawyer partly on the strength of this.
3. **Ratify or overrule the vratmitra policy** (audit 00 §3). Accepting an invitation now grants
   the role, which makes becoming a vratmitra **self-service**. If JP intends vratmitras to be
   appointed, the fix is the opposite and reverting is three lines.
4. **Decide the notification destinations** (#218) and whether the two deep-link maps should
   agree. They have drifted twice.
5. **Decide whether `ENDED` joins the enum** (audit 04 §4). The queries are fixed; the shape that
   produced them is not.

---

## What the audit changed, and what it deliberately did not

**Changed:** the invitation deadlock, the email→account link, 36 error handlers, the e2e suite and
its CI workflow, two access-control filters, one profile statistic, and three completion records.

**Deliberately not changed:** anything needing a product decision — notification destinations,
export delivery, the state enum, whether vratmitras are appointed or self-selected. Those are
recorded with options and left open.

---

## The methodological lesson, turned on the audit itself

The audit made the same class of mistake it was auditing, **three times**, and each is recorded
where it happened rather than quietly fixed:

- The tick-checker's first run reported **123 misses; 90 were its own blind spot** (pass 02 §1).
- The e2e workflow **failed in CI twice** on config values and a missing variable that no local run
  could catch — including forgetting the very variable the pass existed to add (pass 01 §7).
- `listVratarthisForVm` was written **global-only** hours earlier by the same session that then
  found the dual-model problem (pass 04 §3).

So the rule is not "be more careful". It is the one `CLAUDE.md` already carries, now with eight
instances behind it:

> **A check run with something that does not share the user's constraints confirms the mechanism
> and misses the experience.**

The purest instance found here: **every test in the repository handed out the `VRATMITRA` role in
a fixture** — unit, integration, and the Playwright suite, which inserted it with raw SQL. So
`flow-03-vm-invite-approve.spec.ts`, a test *named* for the invite/accept flow, passed for months
while that flow returned 403 to every real user. The fixture created a state **no user could
reach**.

That is why the rule established in pass 01 matters more than any single fix:

> **A fixture may grant what the product cannot, and nothing else.**
