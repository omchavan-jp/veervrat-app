# Trusted production controller

Design approved by the maintainer on 2026-10-12. Boundary foundation #364 merged and applied;
workflow implementation and live production verification are separate evidence.

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
production concurrency group. GitHub concurrency is not an unlimited FIFO queue.
Do not rerun a controller attempt: assess failure and submit a new request with a new tag.
GitHub's approval-history API has no review timestamp; the first attempt must have exactly one
owner approval for `prod` on that exact run. The record stores when approval was observed,
not an invented approval timestamp. No production build or tag mutation occurs.

UAT receipts/decisions remain in private `release-records`. Authorized production attempts,
tag claims and outcomes use private `production-release-records`. UAT receives read-only
production history, never its write permission; production reads acceptance and writes its
own audit records. These grants are container-scoped, not account-wide/state/vault grants.
The authorized manifest is conditionally created and read back before a tag claim and app writes.
An unresolved claim blocks later releases until deliberate operator reconciliation. A success
outcome additionally requires the exact controller attempt and deployment job to finish successfully.
Public release-record publication failure is recorded as an audit failure, even if app health passed;
missing private audit evidence is never inferred from a green endpoint.
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

## Boundary activation evidence

Foundation #364 merged at `422f21f9a0b8dcc7cfec33da41c7cc6dac2c236a` after required checks.
The saved shared plan had exactly four creates, no updates or deletions: one private container,
production acceptance reader, production history contributor and UAT production history reader.
Scope dependencies were checked before apply; Azure read-back confirmed all three grants at
their exact container ARM IDs and `production-release-records` public access `None`.
The native prod policy is only branch `main` (policy ID 62744177); old tag policy 62654008
was removed. Owner ID 317451750 remains the sole reviewer, self-review is allowed and
administrator bypass is disabled. CD was paused for the transition and restored active.
No production app, migration, release tag or owner acceptance was performed by this activation.
The authenticated post-apply shared plan completed with exit 0 and no changes after a transient
local network interruption was resolved; no network-control workaround was used.

## Production-write verification

The maintainer subsequently reported actual UAT testing and authorized the deliberate
`prod-2026-10-12` release. Acceptance `38261941774/1`, tag request `38262150079` and
main controller `38262172088/1` succeeded. Native owner approval admitted only the recorded
manifest. Scoped production Terraform/migration/image and private record writes passed;
public/private outcomes and exact live images/health were independently verified, with a
closed claim and clean exact-ref production plan. See [full evidence](release-controls-rollout.md).
This supersedes the first-write pending checkpoint, not the limits of the earlier setup tests.
No artificial production failure/rollback or new production browser/Sentry-delivery test was performed.

Owner follow-up, 2026-10-15: "Everything is working in prod." This records owner-reported
production acceptance, not an independently observed browser matrix or separate delivery,
restore or live-rollback drill. See [verification limits](release-controls-rollout.md#owner-production-confirmation-2026-10-15).
