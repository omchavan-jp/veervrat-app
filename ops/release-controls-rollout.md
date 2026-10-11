# Release controls rollout

Policy: [Git and release governance](../documentation/25_Git-and-Release-Governance.md).
This is incremental implementation, not evidence that production promotion is active.

## Record contract foundation

`.github/scripts/release-record.mjs` validates version-1 UAT receipts and decisions:
full repository/commit, deployment run and attempt, all four exact repository-pinned image
digests, successful exact-SHA mandatory checks, readiness and cross-tier wiring results.
Mixed component digests are intentional: a product-design deployment can replace only web.
An owner decision contains a concrete note, timestamp and acceptance workflow run/attempt.
Its SHA-256 receipt binding covers all evidence, not just the source SHA. Strict fields and
canonical object ordering prevent silently ignored evidence and insertion-order differences.

The validator accepts evidence, not credentials. Its actor ID, main-history result, check
results and successful-production outcome must come from trusted workflow/GitHub/Azure
read-back, never manual JSON inputs. A hash is not a signature or proof of provenance.
Changing JSON and recalculating a hash must not authorize production. Workflow integration
must validate origin and authorization independently before using this library.

Rollback selection requires a previously accepted successful production artifact set and an
explicit schema-compatibility review; it returns exact images and disables migrations.
It does not restore a database, revert Terraform, or automatically recover an outage.
Verification-note validation checks presence/substance only, not whether testing occurred.

## Durable storage and acceptance integration

CD manual operations now include `accept-uat` and `verify-release-storage`, restricted to
main and the owner. The script independently checks numeric repository/actor identities,
including the rerun actor, trusted workflow paths, successful exact run attempts/jobs,
main ancestry, exact check evidence and the currently ready digest-pinned image set.
Inputs are passed as environment values, never interpolated into shell commands.

`accept-uat` takes `uat_run_id`, `uat_run_attempt` and `verification_note`. It reads an
existing private receipt, not caller-supplied JSON. Missing receipts, mutable image tags,
stale images, skipped deploy jobs and source-check failures refuse acceptance. The acceptance
workflow run must itself finish successfully before any future promotion may use its record;
writing a blob alone is insufficient, including if a post-write race check fails.

Storage uses OAuth against the fixed private `release-records` container, conditional
create (`If-None-Match: *`), bounded JSON reads and exact read-back. Keys include both
deployment and acceptance run/attempt identifiers. Records do not expire with Actions artifacts.
The reviewed IAM change is one UAT identity Blob Data Contributor assignment at that container,
not account-wide access or production state access. This built-in role can overwrite/delete
records if misused outside the client; conditional create is a workflow guarantee, not WORM.
Existing account versioning/soft-delete supplies recovery; maintainer/cloud authority remains
a separate trust boundary. Build/prod receive no record permissions in this increment.

`verify-release-storage` creates one small durable record under `probes/<run>/<attempt>.json`,
reads it back and confirms conditional overwrite is refused. This is audit evidence, never a
UAT receipt or acceptance. No app, database or production resource is modified by the probe.
Do not run `accept-uat` on behalf of the maintainer or invent a verification note.

**Activation limitation:** current tag-based UAT images and absence of digest receipts mean
acceptance is deliberately fail-closed until the next deployment integration lands. No actual
UAT acceptance or production promotion has been performed by installing these controls.
The narrow IAM apply and real storage probe must be recorded separately from source checks.

## Remaining activation sequence

1. Apply/verify the narrow record-writer grant and storage probe. Produce authenticated UAT
   receipts after digest-pinned deployment; acceptance consumes those trusted receipts.
2. Teach Terraform/deployment actions to use explicit digest image references, including
   migration/maintenance/backup jobs and preserving current images during migration ordering.
3. Replace tag builds with accepted-set selection, main-history/exact-check verification,
   pre-deployment GitHub Release/manifest creation, serialized prod approval and outcomes.
4. Add deliberate rollback with schema review, new release tag/record and no migration rerun.
5. Test denied paths and UAT; exercise production writes only during a planned, approved release.
6. Reconcile the complete deployment/infrastructure documentation after activation.

The earlier contract PR activated no privileged operations. This integration adds only record
storage/acceptance operations; normal build/deployment behavior remains unchanged. Production
promotion and rollback are not yet active. OpenSpec and dependency upgrades are excluded.
