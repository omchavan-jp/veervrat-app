## 0. Read first

- [ ] 0.1 `design.md` in this change — particularly why the audit write **blocks** here when
  `AuditService` is deliberately fire-and-forget everywhere else.
- [ ] 0.2 `documentation/21_Infrastructure-Conventions.md` §21 — no per-execution job overrides,
  and job logs are found via `ContainerName_s` with `ContainerAppName_s` empty.
- [ ] 0.3 `infra/terraform/modules/environment/seed-job.tf` — the job shape being copied.

## 1. The script

- [ ] 1.1 `apps/api/src/database/grant-admin.ts`, modelled on `seed.ts` (direct `PrismaClient`,
  the named exception in `design.md`).
- [ ] 1.2 Read `BOOTSTRAP_ADMIN_EMAIL`; empty → print "nothing to do", exit 0.
- [ ] 1.3 Look up the user. Not found → print the email, exit non-zero.
- [ ] 1.4 Already has `ADMIN` → print "no change", exit 0, **write no audit row**.
- [ ] 1.5 Otherwise add `ADMIN` to `roles` — additive, never replacing.
- [ ] 1.6 Write the `AuditEvent` row **awaited**; failure → exit non-zero.
- [ ] 1.7 Print before/after roles and the audit action name.

## 2. Tests

- [ ] 2.1 Grants when absent; roles become `[VRATARTHI, ADMIN]`.
- [ ] 2.2 Idempotent: second run changes nothing and writes no second audit row.
- [ ] 2.3 Missing user exits non-zero.
- [ ] 2.4 Empty env var exits zero without touching the database.
- [ ] 2.5 Existing roles preserved (the additive guarantee).
- [ ] 2.6 Auth matrix for the granted role: one positive and one negative — an `ADMIN` reaches an
  admin route, a `VRATARTHI` does not. (AGENTS.md non-negotiable.)

## 3. Terraform

- [ ] 3.1 `modules/environment/grant-admin-job.tf`, copying `seed-job.tf`: same image, identity,
  `database-url` secret, container named `grant-admin`.
- [ ] 3.2 Variable `bootstrap_admin_email`, default `""` — so the job exists but does nothing
  until deliberately targeted.
- [ ] 3.3 Wire it in `envs/uat/main.tf` and `envs/prod/main.tf`.
- [ ] 3.4 Confirm `terraform plan` shows **add only** — no changes to Postgres, Key Vault, or the
  running apps.

## 4. Docs

- [ ] 4.1 `DEPLOYMENT.md`: runbook, including the Log Analytics verification query.
- [ ] 4.2 `documentation/21_Infrastructure-Conventions.md` §22: why bootstrap is a job, why the
  audit write blocks, and why the env var is acceptable here having been rejected in #40.
- [ ] 4.3 `ops/azure-account-facts.md`: the job exists in both environments; note it can mint an
  admin.
- [ ] 4.4 `CHANGELOG.md` — no user-visible change; note under internal.

## 5. Run it

- [ ] 5.1 UAT first: apply, run, **read the job's output** — not its exit code.
- [ ] 5.2 Confirm `/admin` appears for `om.chavan@jnanaprabodhini.org` on UAT.
- [ ] 5.3 Confirm `om.chavan501@gmail.com` is unchanged and still sees no admin nav.
- [ ] 5.4 Prod: same, in the same order.
- [ ] 5.5 Confirm the audit row is visible in `/admin/audit`.
- [ ] 5.6 Reset `bootstrap_admin_email` to `""` and apply, so the standing default targets nobody.

## 6. Close out

- [ ] 6.1 Comment on #75 — the admin-surface half is now reachable; break-glass remains open.
- [ ] 6.2 #40 is unblocked; note it there.
