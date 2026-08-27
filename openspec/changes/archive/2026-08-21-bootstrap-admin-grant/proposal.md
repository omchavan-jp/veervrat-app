## Why

**The admin dashboard exists, is deployed, and nobody can open it.**

Ten pages and 25 API routes live behind `/admin`. Reaching them requires the `ADMIN` role:

```ts
// apps/web/components/layout/app-shell.tsx:86
const isAdmin = (user?.roles ?? []).some((r) => r === 'ADMIN');
```

But no account anywhere has it, and there is no path to getting it:

- signup always assigns `VRATARTHI` — verified on prod, the response is `"roles":["VRATARTHI"]`
- `src/database/seed.ts` creates **content only**; it creates no users at all
- the only way to change roles is `PATCH /admin/users/:id/roles`, which requires already being
  an admin

A closed loop. Every environment has a fully built administrative surface that is unreachable
in principle, not by accident.

### Why this blocks the next piece of work

#40 (per-user capability grants) is designed around toggling grants **in the admin dashboard**.
Designing a screen nobody can open is not a sequencing preference — it is building on a
foundation that is known to be absent. This change is the smallest thing that makes #40
buildable.

It also settles half of #75 ("No way to administer data in a deployed environment"). Today,
removing a test account from prod had no supported path: it was ultimately deleted by the
account holder through Settings, because an admin could not do it — there was no admin.

## What changes

A **`grant-admin` job**, alongside the existing `migrate` and `seed` jobs, that grants `ADMIN`
to one email supplied through Terraform:

```bash
terraform apply -var='bootstrap_admin_email=om.chavan@jnanaprabodhini.org' ...
az containerapp job start -n veervrat-<env>-grant-admin -g veervrat-<env>
```

It is idempotent, writes an audit row, and prints what it did so the result can be **verified
rather than trusted** — the lesson from #112, where a migration job reported success three
times while doing nothing.

## Why a job, and not the alternatives

**Rejected: fold it into the seed job.** Seed is *content* — idempotent, re-run whenever content
changes. Granting a person `ADMIN` is *rare and privileged*. `DEPLOYMENT.md` already argues that
schema and content must not share a mechanism because their lifecycles differ; the same argument
applies here, more strongly.

**Rejected: temporary Postgres firewall exception plus `psql`.** Fastest and worst — an untracked
manual change, no audit row, and a firewall hole someone must remember to close. D15 avoided
per-IP rules for this reason. Acceptable as break-glass, wrong as the standard path.

**Rejected: first signup becomes admin.** Magic, and unsafe once prod is public.

**Rejected: per-execution job overrides** (`--command`/`--args`). Convention §21, established
today: overriding replaces the whole container spec, and — verified on prod — an overridden
execution produces **no retrievable logs at all**. A privileged operation must not run through
the one mechanism guaranteed to hide what it did.

## Why an env var is acceptable here, having argued against it elsewhere

#40 rejects env-var allowlists because `CONTENT_EDITOR_USER_IDS` costs a full deploy cycle **per
person**. This costs one deploy **once per environment, ever**: afterwards the admin promotes
everyone else through the UI. Different problem, different answer.

It also creates no new trust boundary. Anyone who can edit Terraform and deploy already holds
full Azure access, including the database.

## Scope

**In:**
- `grant-admin` Container Apps job (Terraform), UAT and prod
- a script that grants `ADMIN` by email, idempotently, with a guaranteed audit row
- docs: `DEPLOYMENT.md` runbook, convention §22, `azure-account-facts.md`

**Out, deliberately:**
- the capability-grant model itself (#40 — this only unlocks the door it needs)
- an admin/superadmin split. `PATCH /admin/users/:id/roles` already lets any admin add or remove
  `ADMIN` on anyone, guarded only against self-lockout, so admin is *already* effectively
  superadmin. A second tier is complexity without a second audience while there is one operator.
- Deferral Ledger #24, #25, #29 — named here so absorbing them later is a decision, not a drift

## Risks

**A standing mechanism that can mint an admin.** Deliberate: the day admin access is lost, this
is the only way back in. The self-lockout guard is per-person, not global — two admins can remove
each other, so reaching zero admins is reachable, and that is exactly when this is needed.
Mitigated by: Terraform-reviewable spec, an audit row on every grant, and job logs that show what
happened.

**Costs nothing to keep.** Container Apps jobs bill per execution; an idle manual-trigger job is
free, as `migrate` and `seed` already demonstrate. The keep/delete decision is security posture,
not cost.

## Open question for review

Should the job **refuse to run on prod** when the target user's email is unverified? It would
prevent granting admin to an address nobody has proven they own. Leaning yes, but it adds a
failure mode during exactly the bootstrap moment when recovery matters most.
