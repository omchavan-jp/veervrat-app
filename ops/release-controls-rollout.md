# Release controls rollout

Policy: [Git and release governance](../documentation/25_Git-and-Release-Governance.md).
This separates incremental implementation, boundary read-back and real production-write evidence.

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
a separate trust boundary. Build/prod received no record permissions in that increment;
#364 subsequently granted production acceptance read access and separate history write access.

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
reference; backup has its own reference. Empty `image_refs` retains legacy production state
compatibility; the protected-main controller uses explicit accepted references. This UAT
evidence does not claim a production deployment.

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
A fresh [read-only regression 38160537973](https://github.com/omchavan-jp/veervrat-app/actions/runs/38160537973)
passed on the deployed digests, reporting `allowedBaselineChanges: []`; no apply was performed.
Receipt persistence proves automated evidence/configuration, not that every backup/maintenance
job was exercised or that someone tested every feature. Full documentation reconciliation and
production promotion/rollback remain separate steps.

## Historical activation sequence — implementation delivered

This was the staged plan, not the current pending-work list. Steps 1 and 3–5 were subsequently
implemented and verified to the limits recorded below; documentation reconciliation follows
in the 2026-10-15 consistency pass. Step 2's separate live web-only/mixed-digest rollout and a
deliberate live rollback/failure drill are not claimed. Source tests are not those live drills.

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
the original digest integration updated UAT only. Production controller source and boundary
activation are described below; production writes subsequently passed in the deliberate release.
OpenSpec and dependency upgrades are excluded.

## Trusted production controller integration

The main-only native prod boundary and private history grants were activated in #364; exact
plan/apply/read-back evidence is in [controller record](production-controller.md).
`production-release.yml` checks out its own protected-main SHA, never the triggering tag's
workflow code/artifacts. Preflight validates exact archived deployment/check/acceptance attempts,
the full tag/main commit and accepted digests, then creates a prerequisite GitHub Release asset.
Production admission additionally validates that asset's SHA-256 digest, native exact-run owner
approval and unchanged baseline before private manifest/claim read-back and app writes.

Rollback needs an owner-recorded request before a new tag, a successful verified prior production
outcome, and current-schema review. It uses current infrastructure, refuses non-image Terraform
changes and skips migrations. A malformed outcome, unresolved claim, changed digest, absent
acceptance or reused tag cannot authorize deployment. Controller reruns are refused because
GitHub approval history supplies no timestamp/attempt binding; records store observation time.
Public audit failure is recorded as such; private audit failure leaves an unresolved claim.

Local controller, storage, policy and deployment regression tests pass, along with workflow
syntax/context validation. Post-merge read-only receipt/history verification, UAT rollout and
the first deliberate production write are separate checkpoints, not implied by those tests.
Setup creates no acceptance, production tag, production approval or production deployment.

## Controller verification (2026-10-12)

Implementation #365 merged at `b9d5c0c7929908f5835a654e735110c801be4e68` after all seven
PR checks passed. The 68 local controller/security/storage/deployment/governance tests,
uncached workspace lint/typecheck and pinned actionlint validation passed.

- [Read-only receipt/history verification](https://github.com/omchavan-jp/veervrat-app/actions/runs/38231137720)
  verified the authenticated `38142359832/1` UAT receipt, archived exact checks and main history.
  Production history was readable with zero outcomes/claims; `productionAuthorized=false`,
  prepare succeeded and deploy was skipped. This did not create owner acceptance.
- [Absent receipt refusal](https://github.com/omchavan-jp/veervrat-app/actions/runs/38231284277)
  reached authenticated storage and failed for receipt `1/1` with HTTP404; deploy was skipped.
  The positive control above used the same private container/identity and succeeded.
- [Missing acceptance refusal](https://github.com/omchavan-jp/veervrat-app/actions/runs/38232216761)
  inspected existing immutable tag `prod-2026-08-30` from trusted main code, then refused
  preparation because no owner UAT acceptance matched it; deploy was skipped. No tag or
  GitHub Release was created/updated. Its intentional red status is denial evidence, not a failed deployment.

All post-merge main CI, integration, E2E and CodeQL checks passed. Production app/database
writes and private production-writer proof were still pending at that setup checkpoint and
are now verified by the deliberate release below. Rollback execution has not been fabricated.

[UAT CD 38231047598/1](https://github.com/omchavan-jp/veervrat-app/actions/runs/38231047598)
completed successfully at the #365 merge commit. `deploy-uat` itself succeeded, verified migration
execution `veervrat-uat-migrate-cqbvwyx`, database/Redis readiness, runtime web/API wiring and
sole healthy active revisions on the intended exact digest set. It conditionally created and
read back `receipts/uat/38231047598/1.json`.
[Controller read-back](https://github.com/omchavan-jp/veervrat-app/actions/runs/38232797117)
verified that new receipt and checks, read empty production history and skipped deploy.
[The ordinary UAT-completion event](https://github.com/omchavan-jp/veervrat-app/actions/runs/38232377593)
skipped the whole production controller, as required. Public UAT `/ready` independently returned
database/Redis up; it is not a substitute for owner browser acceptance.

Verified configured/serving images in the receipt:

| Component | Digest (repository prefix is fixed by the receipt validator) |
| --- | --- |
| API | `sha256:baf7c6e6cbe531a45e24c76208116f5c5d181c15efe1573426a9d24af25e760a` |
| Web | `sha256:d79c21fe2d80ac5b433a442075f3eba1ef3f4fdc4eac51ec2f048ba62240af55` |
| Migration/maintenance | `sha256:b1bbe3dd8a613d0a671cb4e8640e757ec98b34d0b0e152eb6bd509f579757d0d` |
| Backup | `sha256:ea7f5937135f07028f5cf39634fec63714ccf63108ad93e88d178706b2a7028b` |

No owner acceptance or production tag, approval, manifest claim, app write or database migration
was created by those setup tests. Actual tag-to-controller production release and record-writer
operations were subsequently verified separately, not claimed from fixture/read-only evidence.

## First verified production promotion (2026-10-12)

The maintainer reported successful UAT login/logout, weakness selection, assessment, sentence
selection, journey start and password-reset flows, and explicitly authorized acceptance,
tag creation and production approval. The recorded note uses only those reported tests.
[Acceptance 38261941774/1](https://github.com/omchavan-jp/veervrat-app/actions/runs/38261941774)
verified the live exact UAT set/checks and created the decision plus acceptance index.
Its key is `acceptances/uat/38231047598/1/38261941774/1.json`; the receipt digest is
`26e7896021f58254aac1e0c079c7919b3aac55566b9ac8c6fe1d5568f3ec41f5`.

Immutable tag `prod-2026-10-12` selects app commit
`b9d5c0c7929908f5835a654e735110c801be4e68`.
[Tag CD request](https://github.com/omchavan-jp/veervrat-app/actions/runs/38262150079)
succeeded without a build/deploy. [Main controller 38262172088/1](https://github.com/omchavan-jp/veervrat-app/actions/runs/38262172088)
executed `f32e5f9110a9e7a2c85246125000eb7e62049311`, validated evidence and published the
prerequisite [GitHub Release](https://github.com/omchavan-jp/veervrat-app/releases/tag/prod-2026-10-12).
Manifest `manifest-38262172088-1.json` is 78,491 bytes, SHA-256
`6f305f2815aa406b22ac900c89253c32d7f5dd40958a1ca23bc8a4f27efd289a`.
The manifest was downloaded/validated before native owner approval under the maintainer's
explicit instruction; no admin bypass or rerun approval was used.

Production held old app references until verified Prisma execution
`veervrat-prod-migrate-yq6wmgs`, then applied the exact accepted set without rebuilding.
The only migration since actual production commit
`3037e8757ac3f069c36d2e678c8d18e0e3566f05` adds `product_docs_view` to the capability enum;
there are no schema/data removals in that migration. Recovery remains forward-only and any
future rollback must reassess compatibility before a new tag/approval.

The controller and deploy job completed successfully, including post-revision exact digest,
readiness/wiring and private/public audit steps. Outcome `outcome-38262172088-1.json` is
SHA-256 `449c5948d8a415d9712e5330ca4c0236daf7ffff5f15a8930c0c79dc071c4282`.
Approval owner ID is 317451750; approval observation time is `2026-10-12T14:22:57.612Z`;
outcome completion is `2026-10-12T14:30:05.126Z`. These UTC times are observation/record times,
not an invented native review timestamp. Private keys are:

- `manifests/prod-2026-10-12/38262172088/1.json`
- `claims/prod-2026-10-12.json`
- `outcomes/prod-2026-10-12/38262172088/1.json`

Independent private read-back reran the outcome/provenance/approval validator, checked the
stored manifest and confirmed the claim closes against the successful outcome. Independent live
Azure reads matched all four accepted digests; public probes verified DB/Redis readiness and
actual production API URL in served web markup. Web `SENTRY_DSN` is configured and
`PRODUCT_DOCS_MODE=off`. No fresh production browser-flow, Sentry-delivery or backup-restoration
test is claimed. Rollback implementation is source-tested, not live-executed by inducing failure.
An independent authenticated, normally locked production plan used the exact deployed image
references/commit metadata and completed with exit 0, no changes. It was read-only; no second
operator apply or production rerun was performed.

## Owner production confirmation (2026-10-15)

After the release, the maintainer reported: "Everything is working in prod." This closes the
request for owner-reported production acceptance. It does not retrospectively change the
2026-10-12 automated evidence or assert a detailed browser test matrix that was not supplied.
No separate WebSocket-delivery, Sentry-delivery, backup-restoration or live-rollback drill is
claimed by that general confirmation. Those remain separately scoped operational checks,
not evidence that the implemented release controls are absent.
