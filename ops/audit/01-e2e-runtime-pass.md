# Audit 01 — The runtime pass: turning on the tests that already existed

**Run 2026-08-27.** Second of five passes.

**Scope.** Wire the Playwright suite into CI and run all twelve flows. The point of this pass is
that static reading cannot tell you what is broken; only walking the journeys can.

---

## 1. The finding that started it

`e2e/` held **12 Playwright specs**, written over months, covering signup, journeys, VM invite and
approval, moderation, admin override, guest browsing and draft tests. They appeared in **no CI
workflow**. Last touched 2026-08-22.

`.github/workflows/README.md` said why:

> **Playwright E2E is not in CI yet** — it needs the full docker stack… deferred to a dedicated
> workflow. **Unit + integration + build cover the code paths.**

That last sentence is the belief this whole audit exists to correct. Unit, integration and build
covered the code paths and missed the 100kb body limit, the dead toast hook, the CORP header, 36
discarded error messages, and an accept flow that returned 403 to every user.

**The stated reason was not the real one.** The docker stack was already running. The suite could
not pass for a different reason, below.

---

## 2. Baseline: what the suite did when finally run

First run, on a clean Redis, no changes: **8 failed · 17 passed · 1 skipped · 4 did not run.**

The eight failures had exactly three causes.

### Cause A — registration is rate-limited to 5/hour; the suite registers ~15 (5 failures)

`auth.controller.ts` throttles `POST /auth/register` at `{ ttl: 3600000, limit: 5 }` per IP.
Exercising ten user journeys needs roughly fifteen accounts from one IP inside two minutes.
Flows 04, 05, 06, 07 and 10 died on **HTTP 429 before reaching a single assertion**.

The control is correct and the suite is correct. They were simply never run together, so nobody
discovered they are incompatible. **This, not the docker stack, is why the suite was never wired
up.**

**Fix.** `registerThrottle()` in `throttler-config.factory.ts` reads `AUTH_REGISTER_LIMIT`,
defaulting to 5 — and **ignores the override entirely when `NODE_ENV === 'production'`**, which
is what UAT and prod both run. The seam exists where the throttle protects nothing and cannot be
widened where it protects something. Pinned by `register-throttle.spec.ts`, including that no
value whatsoever loosens production.

### Cause B — three specs written against a page that has since been restructured (3 failures)

`/signup` now leads with Google, and the email + password fields sit inside a `Collapsible` that
is **collapsed by default**. `flow-01`, `flow-09` and `auth-and-nav` looked for
`input[type="password"]` that is not rendered until you click "Sign up with email instead".

The specs rotted silently **because nothing executed them.** This is test rot, not a product
defect — but it is what a disconnected runtime pass decays into, and it is the cost of the
deferral.

Two further pieces of rot surfaced while fixing them, both worth recording because both are the
same mistake:

- **Index-targeted fields.** `flow-01` filled `input[type="text"]` `nth(0)` and `nth(1)` as
  displayName then username. The restructure put username *above* the collapsible and displayName
  *inside* it, silently swapping them. Now targeted by `#signup-username` / `#signup-displayName`.
- **A submit selector that matched the wrong button.**
  `getByRole('button', { name: /sign ?up|create account|register/i }).first()` also matches
  **"Sign up with email instead"**, which comes first in DOM order. The click *closed* the panel
  instead of submitting; no account was created, and the failure surfaced fifteen seconds later
  as a missing verification token. Now `/^create account$/i`.

The spec also never filled **date of birth** or ticked **consent**, both required since the 18+
gate. A signup spec that skips consent is not testing signup.

### Cause C — a test that depended on a real person's account (1 failure, and a credential)

`e2e/auth-and-nav.spec.ts:8` read:

```ts
const VA = { email: 'om.chavan501@gmail.com', password: 'Om@12345678' };
```

A **live personal credential committed to the repository**, and a test whose outcome depended on
the state of one human's account. It failed for exactly that reason: the account predates the
consent gate, so a blocking consent dialog intercepted every click and no navigation assertion
could run.

Now the suite registers its own account, which consents during registration and starts clean.

> ⚠️ **The password remains in git history.** Introduced in `258395a`. Removing the line does not
> remove it from history. **That password must be rotated**, and this is the only action from this
> audit that cannot be completed in code. Tracked alongside O12 (OAuth secret rotation).

---

## 3. The fixture that was hiding a defect

`e2e/helpers/global-setup.ts` granted the shared VM account `vratmitra` with a raw SQL
`INSERT INTO user_roles`.

That one line is why `flow-03-vm-invite-approve.spec.ts` — named for the invite/accept flow —
passed for months while accepting a vratmitra invitation returned **403 to every real user**
(audit 00). Accepting required the role; nothing in the product granted it; the fixture supplied
it before the flow began. **The suite was asserting against a state no user could reach.**

Now: `ADMIN` and `MODERATOR` are still granted directly, because the product has no path to those
roles and there is nothing a test could drive instead. **`VM` gets nothing.** It earns the role by
accepting an invitation, the way a person does.

**The rule this pass establishes:** a fixture may grant what the product cannot, and nothing else.

---

## 4. Ledger #8 — the defect that was known, written down, and lost

`flow-04` contained a skipped test:

```ts
// BLOCKED (Ledger #8): accepting the VM role after signup requires invite→account linking +
// VRATMITRA role grant that is not yet implemented. Re-enable when that backfill lands.
test.skip('the new user accepts the VM role via the invite link', ...)
```

**Somebody diagnosed this correctly and it went nowhere.** No issue, no beta blocker, no entry in
`backlog.md`. The knowledge lived in a skipped test's comment — the one place nobody reads — while
the product shipped an invitation flow that could not complete.

It named two blockers. Audit 00 fixed the first. The second was still real:

**An invitation to someone not yet on Veervrat is created with `inviteeId = null`, and nothing
ever filled it in.** After that person signed up, the invitation still pointed at nobody, so
`vm_invitation.accept` — which checks `invitation.inviteeId === user.id` — refused the very person
it was addressed to, permanently. **Inviting someone by email could never complete.**

Fixed by `linkPendingInvitations` in `auth.repository.ts`, applied at **both** account-creation
paths (email and OAuth — a gate on one route is not a gate). Only `PENDING` invitations are
linked; expired and cancelled ones stay as they were.

The skipped test is now **un-skipped and passing**.

---

## 5. Result

| | Baseline | After |
|---|---|---|
| Failed | **8** | **0** |
| Passed | 17 | **29** |
| Skipped | 1 | 0 |
| Did not run | 4 | 0 |

Passing with an **honest fixture** — no SQL role grant — so `flow-03` and `flow-04` now prove the
invitation path end to end through a browser.

Full gate alongside: 8/8 tasks, 0 errors, **1016 api + 202 web** tests executed with `--force`.

---

## 6. The workflow

`.github/workflows/e2e.yml` — Postgres 18 + Redis 8 service containers, migrations, content seed,
chromium, both servers started by `playwright.config.ts`, report uploaded on failure. Separate
from Integration so a browser flake never blocks the fast code gate.

**No Meilisearch, no MinIO.** `MEILI_HOST` is optional — unset, search returns empty — no flow
exercises search, and the backend is moving to Postgres `pg_trgm` (#194). No flow uploads a file.
If one is added, add the service; do not add a flow that skips the upload and call it covered.

---

## 7. What this pass did NOT establish

- **Whether the workflow passes in CI.** It has run green locally, many times. GitHub's runner is
  a different machine with different timing, and `retries: 2` is set for CI and not for local. The
  first CI run is the evidence, and it has not happened yet at the time of writing.
- **That the flows cover what matters.** They cover ten journeys. Nobody has checked that ten is
  the right ten, or that the assertions inside them are strong. A green suite is a floor.
- **Anything about uploads, search, email delivery, or payments.** Not exercised.
- **`flow-01`'s own "KNOWN BLOCKER (Deferral Ledger #33)"** — that the onboarding account-setup
  form does not submit under Playwright, with the note *"Real users are unaffected."* That claim
  is **unverified**. Given that the sibling claim in `flow-04` turned out to be two real defects,
  and that flow-01's own submit failure turned out to be a bad selector rather than a framework
  quirk, this deserves the same scrutiny. It has not received it.
