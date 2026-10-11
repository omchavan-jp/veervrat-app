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

## Remaining activation sequence

1. Persist authenticated UAT deployment receipts and owner-only acceptance decisions in the
   existing private `release-records` container. Add narrowly scoped writer/reader permissions
   through reviewed Terraform; use unique records, conditional create, and read-back.
   Validate successful deployment job/run/attempt, exact checks and live deployed digests.
2. Teach Terraform/deployment actions to use explicit digest image references, including
   migration/maintenance/backup jobs and preserving current images during migration ordering.
3. Replace tag builds with accepted-set selection, main-history/exact-check verification,
   pre-deployment GitHub Release/manifest creation, serialized prod approval and outcomes.
4. Add deliberate rollback with schema review, new release tag/record and no migration rerun.
5. Test denied paths and UAT; exercise production writes only during a planned, approved release.
6. Reconcile the complete deployment/infrastructure documentation after activation.

No acceptance/storage writer, promotion job or rollback command is activated by the record
contract PR. Existing CD behavior is unchanged. OpenSpec and dependency upgrades are excluded.
