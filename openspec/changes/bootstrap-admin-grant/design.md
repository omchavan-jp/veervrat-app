## Where the grant is written

The script runs **outside the Nest application** — it is a one-off job container, like
`seed.ts`. Two consequences worth stating rather than discovering.

### Prisma outside repository files

`AGENTS.md` says *"No Prisma outside repository files — ever"*. That rule governs the Nest
application layers, where a stray query bypasses the repository boundary. Standalone database
scripts are an established exception: `src/database/seed.ts` constructs `PrismaClient` directly
and has since the project began.

This script follows that precedent **deliberately and namedly**, not by oversight. Reusing the
Nest DI container to obtain a repository would mean booting the whole application — config
validation, Redis, every module — to write one row.

### The audit write must block

`AuditService.record()` is fire-and-forget by design (spec/17): an audit failure must never fail
a user's request.

That is the wrong guarantee here. A job that grants `ADMIN` and *fails to record it* has done the
most privileged thing in the system invisibly. This script therefore writes the `AuditEvent` row
**synchronously and awaited**, and fails the job if the write fails.

Same table, same shape, opposite failure policy — because the tradeoff is genuinely reversed:
there, availability beats the record; here, the record beats convenience.

## Idempotency

`ADMIN` is added to `roles` only if absent. Running twice is a no-op that says so:

```
already an admin: om.chavan@jnanaprabodhini.org — no change
```

No audit row is written on a no-op. An audit log that fills with "granted admin" for grants that
did not happen is worse than no log.

## Failure modes, and what each prints

| Situation | Behaviour |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` unset/empty | exit 0, print "nothing to do" — so the job is safe to run |
| no user with that email | **exit non-zero**, naming the email; the account must sign up first |
| user found, not yet admin | grant, audit, print before/after roles |
| user found, already admin | exit 0, print "no change", no audit row |
| audit write fails | **exit non-zero** — see above |

The "no such user" case is a hard failure on purpose. Bootstrapping is deliberate; silently
doing nothing because of a typo in an email address is the failure this whole change exists to
prevent — an operation that reports success without acting.

## Verification, not trust

Follows #112's rule: the job's own output is the evidence. `DEPLOYMENT.md` gains the Log
Analytics query, filtering `ContainerName_s == 'grant-admin'` — remembering that
`ContainerAppName_s` is **empty** for job rows (§21).

Expected on success:

```
granting ADMIN to om.chavan@jnanaprabodhini.org (a1b2…)
roles: [VRATARTHI] -> [VRATARTHI, ADMIN]
audit event recorded: admin.role.bootstrap_granted
```

## Why `roles` is additive, not replaced

`roles` is a list. Granting `ADMIN` must **not** remove `VRATARTHI`, or the operator loses their
own practice data's role context. Verified from prod: signup returns `"roles":["VRATARTHI"]`, and
the intended admin account keeps it.

This is also why the recommendation is to bootstrap the **institutional** account
(`om.chavan@jnanaprabodhini.org`) rather than the personal one: admin is a role that outlives a
person, audit entries read correctly, and the personal vratarthi account keeps showing the
product as a real user sees it — which matters when the operator is also the product's judge.
