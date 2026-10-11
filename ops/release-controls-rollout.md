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

Storage activation in #360 was verified: one container-scoped grant applied, fresh shared plan
clean, UAT identity probe `38138433259` passed, and storage probe `38138349096` attempt 2 passed
conditional create/read-back/overwrite denial after an initial HTTP403. See
[activation evidence](https://github.com/omchavan-jp/veervrat-app/pull/360#issuecomment-6108918250).
Neither probe deployed an application or created acceptance.

## Digest deployment and receipt integration

Checked PRs #361/#362 enabled UAT only. Four build records (or web only for docs work) carry
digest/full commit/run/attempt identity and are consumed from that same workflow attempt.
Deployment uses full references, keeps old apps through migration, plans before each apply,
and forbids deletion/replacement. All migration-based maintenance jobs use the migration
reference; backup has its own reference. Empty `image_refs` retains the legacy path for
production until the separate promotion integration lands; do not assume prod has changed.

UAT health verification covers both app and docs-only paths. Receipt creation re-reads ready
single-revision app references and configured job images, compares the intended exact set,
checks the latest successful main-push CI/integration/E2E runs for the exact SHA, and persists
the private receipt with conditional creation/read-back. `completedAt` is the receipt capture
time after deployment health checks, not a claim that the containing workflow already ended.
Owner acceptance subsequently requires that workflow/attempt and deploy job to finish successfully.
Latest failed checks, read/auth errors, digest drift or storage failure refuse receipt/acceptance.

First rollout `38140315628` deployed all four digest references, verified execution-scoped
migration output, readiness and wiring, but failed the receipt's revision metadata check.
No receipt/acceptance success is claimed for that failed run. The follow-up verifies the actual
sole active healthy revision and its exact image, waits boundedly for convergence, then repeats
public readiness/wiring before storing a receipt. Read/auth failures are not retried as readiness.
Successful end-to-end receipt verification:
[38142359832](https://github.com/omchavan-jp/veervrat-app/actions/runs/38142359832), attempt 1,
commit `4fad255e6ba982066dd876e3ca91fa90c349e6dd`. All four build jobs and `deploy-uat`
succeeded; `deploy-prod` and `accept-uat` were skipped. Migration execution
`veervrat-uat-migrate-vesqzlf` produced verified output. Readiness and exact served runtime API
URL checks passed. The receipt waited through the old/new active revision transition before
requiring the sole latest Healthy revision on each exact app image. It was conditionally
created and read back at `receipts/uat/38142359832/1.json`.

| Component | Exact digest (registry repository prefix omitted)                       |
| --------- | ----------------------------------------------------------------------- |
| api       | sha256:f4fc0adede2ec861abd3e6078d26c95d0854b1d866d2f5a2d4d3e8b4beb7e808 |
| web       | sha256:abeb23ef4b52a443682dc5db4d783fd28770ab5295f9ccd7174fd77e4ac64675 |
| migrate   | sha256:3c34c70dbcea4cd116fd257ccf1099561b32efc30d60f2800883779096cb695f |
| backup    | sha256:4301c8d6d6b79b56589d4a0a8cde68be5388c669db687005273d85a41c0d92d4 |

No production tag/deployment or human acceptance was created. Human acceptance is still the
owner's actual testing decision, not a side effect of these automated checks.
The read-only identity/plan verifier must preserve the exact four deployed references,
including independent backup images, and read commit metadata separately from a digest.
The follow-up compatibility fix handles both SHA tags and digests; UAT still requires a
zero-change plan, and the known production-only baseline guard remains unchanged.
Receipt persistence proves automated evidence/configuration, not that every backup/maintenance
job was exercised or that someone tested every feature. Full documentation reconciliation and
production promotion/rollback remain separate steps.

## Remaining activation sequence

1. Owner acceptance consumes verified receipts after actual UAT testing; do not manufacture it.
2. Docs-only preservation is unit-tested; verify its live path when an appropriate real change
   is available rather than claiming it was exercised by the full-app rollout.
3. Replace tag builds with accepted-set selection, main-history/exact-check verification,
   pre-deployment GitHub Release/manifest creation, serialized prod approval and outcomes.
   Ensure historical tagged workflow versions cannot bypass the trusted release controller.
4. Add deliberate rollback with schema review, new release tag/record and no migration rerun.
5. Test denied paths and UAT; exercise production writes only during a planned, approved release.
6. Reconcile the complete deployment/infrastructure documentation after activation.

The earlier contract PR activated no privileged operations. #360 added storage/acceptance;
the digest integration updates UAT only. Production promotion and rollback are not yet active.
OpenSpec and dependency upgrades are excluded.
