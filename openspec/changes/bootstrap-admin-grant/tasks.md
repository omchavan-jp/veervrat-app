## 0. Read first

- [x] 0.1 `design.md` in this change — particularly why the audit write **blocks** here when
  `AuditService` is deliberately fire-and-forget everywhere else.
- [x] 0.2 `documentation/21_Infrastructure-Conventions.md` §21 — no per-execution job overrides,
  and job logs are found via `ContainerName_s` with `ContainerAppName_s` empty.
- [x] 0.3 `infra/terraform/modules/environment/seed-job.tf` — the job shape being copied.

## 1. The script

- [x] 1.1 `apps/api/src/database/grant-admin.ts`, modelled on `seed.ts` (direct `PrismaClient`,
  the named exception in `design.md`).
- [x] 1.2 Read `BOOTSTRAP_ADMIN_EMAIL`; empty → print "nothing to do", exit 0.
- [x] 1.3 Look up the user. Not found → print the email, exit non-zero.
- [x] 1.4 Already has `ADMIN` → print "no change", exit 0, **write no audit row**.
- [x] 1.5 Otherwise add `ADMIN` to `roles` — additive, never replacing.
- [x] 1.6 Write the `AuditEvent` row **awaited**; failure → exit non-zero.
- [x] 1.7 Print before/after roles and the audit action name.

## 2. Tests

- [x] 2.1 Grants when absent; roles become `[VRATARTHI, ADMIN]`.
- [x] 2.2 Idempotent: second run changes nothing and writes no second audit row.
- [x] 2.3 Missing user exits non-zero.
- [x] 2.4 Empty env var exits zero without touching the database.
- [x] 2.5 Existing roles preserved (the additive guarantee).
- [x] 2.6 Auth matrix for the granted role — **already covered**, not duplicated:
  `permission.guard.integration.spec.ts:128` (VRATARTHI → 403 on an admin route) and `:154`
  (ADMIN → 200). That is the positive/negative pair for the role this job grants.

## 3. Terraform

- [x] 3.1 `modules/environment/grant-admin-job.tf`, copying `seed-job.tf`: same image, identity,
  `database-url` secret, container named `grant-admin`.
- [x] 3.2 Variable `bootstrap_admin_email`, default `""` — so the job exists but does nothing
  until deliberately targeted.
- [x] 3.3 Wire it in `envs/uat/main.tf` and `envs/prod/main.tf`.
- [x] 3.4 Confirm `terraform plan` shows **add only** — no changes to Postgres, Key Vault, or the
  running apps.

## 4. Docs

- [x] 4.1 `DEPLOYMENT.md`: runbook, including the Log Analytics verification query.
- [x] 4.2 `documentation/21_Infrastructure-Conventions.md` §22: why bootstrap is a job, why the
  audit write blocks, and why the env var is acceptable here having been rejected in #40.
- [x] 4.3 `ops/azure-account-facts.md`: the job exists in both environments; note it can mint an
  admin.
- [x] 4.4 `CHANGELOG.md` — no user-visible change; note under internal.

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
