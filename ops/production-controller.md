# Trusted production controller

Design approved by the maintainer on 2026-10-12. Activation is separate from this record.

Production releases remain identified/requested by immutable owner-created `prod-*` tags.
The controller executes protected **main** code, not workflow code copied from the tag.
The native `prod` environment permits main only, requires owner approval, allows owner
self-review for this iteration and disallows administrator bypass. Older tagged CD workflows
cannot obtain production credentials through that environment. The historical CD production
jobs were tag-only; the new controller must explicitly reject all other request origins.

A reviewed `workflow_run` controller listens to completed CD tag requests. Main UAT runs
are ignored. It revalidates repository IDs, owner/triggering actor, the actual immutable tag,
main history, exact successful checks, successful UAT deployment/acceptance runs and accepted
digests. No triggering-run artifact or executable is trusted. The controller checks out its
own main SHA; accepted infrastructure code is fetched only after eligibility, in a separate
directory. Production changes begin only after native approval and manifest revalidation.

The preflight produces a GitHub Release plus a machine-readable manifest before any
production infrastructure, migration or app change. All release runs share one non-cancelling
production concurrency group. A cancelled pending request can be deliberately retried;
GitHub concurrency is not an unlimited FIFO queue. No production build or tag mutation occurs.

UAT receipts/decisions remain in private `release-records`. Authorized production attempts,
tag claims and outcomes use private `production-release-records`. UAT receives read-only
production history, never its write permission; production reads acceptance and writes its
own audit records. These grants are container-scoped, not account-wide/state/vault grants.
The built-in contributor role is not WORM; conditional creates and protected workflow provenance
remain essential, and human cloud-maintainer authority is a separate trust boundary.

Rollback is owner-requested, uses a new tag and a previous successful controller-verified
production outcome, requires a concrete current-schema compatibility review, and reruns no
migrations. It changes only image references/commit metadata under current infrastructure;
other planned changes are refused. Database restore and partial infrastructure recovery are
separate operator decisions. Legacy production versions without a verified outcome are not
invented as eligible automatic rollback targets.

Setup tests may inspect UAT receipts and denied paths. No human acceptance, production tag,
production-capable deployment job approval or production deployment is part of setup.
Production writes are verified only during the owner's deliberate accepted release.
OpenSpec, dependency updates, organization/teams and dev/preview environments remain excluded.
