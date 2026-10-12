# Scoped Azure deployment identities

Owner: omchavan-jp. Authorization: maintainer chat, 2026-10-11.
Status: all three candidates verified, environment clients switched, scoped UAT rollout successful,
legacy grants/trusts removed and fresh legacy federation rejected.
PR #352 merged at `7b3ceed5fe8a5de6db14a43b49d0053f151ee5b1` after all seven checks.
A fresh locked plan applied twelve additions, zero changes/deletions; private state backup preserved.
Candidate variables are staged on each environment. CD was restored after apply.
Initial build probe `38122789428` stopped before Azure login because composite-action `vars`
references were unsupported; explicit input wiring and a regression check repair this without
changing permissions. Failures below are historical checkpoints, not current candidate status.
The repaired build probe `38123386860` reached Azure login but stopped on token-audience
validation. Entra documents resource URI or API application-ID GUID audiences; the verifier
now accepts only the known corresponding API GUID/URI, never arbitrary audiences. Client,
principal, tenant, expiry and live resource checks remain mandatory.
Terraform state migration is complete; see [evidence](terraform-state-migration.md).

## Verified cutover evidence

- Build read-only probe: [38123937499](https://github.com/omchavan-jp/veervrat-app/actions/runs/38123937499), successful.
- UAT permission/clean-plan probe: [38124084013](https://github.com/omchavan-jp/veervrat-app/actions/runs/38124084013), successful.
- Production permission/baseline-plan probe: [38124255640](https://github.com/omchavan-jp/veervrat-app/actions/runs/38124255640), successful;
  normal deployment jobs skipped, owner approval required and explicitly authorized for read-only verification.
- Temporary prod main-branch policy `62661499` was removed afterward; read-back again showed only
  `prod-*` tags, required owner review and administrator bypass disabled.
- Environment `AZURE_CLIENT_ID` values switched to the verified replacements; the repository-level
  legacy fallback was removed. Candidate principal metadata remains available for regression probes.
- Real publishing/UAT deployment: [38124662672](https://github.com/omchavan-jp/veervrat-app/actions/runs/38124662672), successful;
  four image builds published, UAT applied and passed readiness/wiring checks, production skipped.

Production application writes have **not** been exercised. Verify those only during a deliberate
UAT-approved release. Retirement merged in #355 at `ddf9bc82e7b4585c513858b8c33327b5f4091bf5` after
all seven checks. A fresh locked plan applied zero additions/changes and exactly nine removals:
six old grants and three old FICs. Private recovery state preserved; replacement grants/apps/data
untouched. State read-back confirmed zero managed legacy grants/FICs, twelve replacement assignments
and the then-retained, guarded legacy identity object. CD restored to active afterward.

Fresh federation regression [38133195235](https://github.com/omchavan-jp/veervrat-app/actions/runs/38133195235)
passed: same-assertion replacement authentication succeeded and the old client returned
`AADSTS70025` (no configured federated credentials). Both deployment jobs were skipped.

Retirement review/apply contained zero additions/changes and exactly nine deletions. The
roleless/trustless identity object was initially retained for audit, not as an active credential.
The maintainer subsequently authorized removing that unused object in the
[focused cleanup](focused-cleanup-2026-10-11.md). Checked PR #357 and a fresh guarded plan
were followed by its one-resource deletion, separate from the earlier nine-grant/trust retirement.
Post-deletion regression `38136071955` passed and a fresh shared plan reports no changes.
Post-apply `verify-legacy-revoked` uses the same fresh GitHub assertion to successfully authenticate
the replacement and require a specific missing/mismatched-trust or absent-application error from the old client.
It never logs tokens or performs production writes. Already-issued tokens and Azure propagation
caches are separate from proving that fresh federation is rejected; do not overstate immediate expiry.

## Desired permissions

| Identity | Role | Scope |
| --- | --- | --- |
| build | Reader + AcrPush | `veervratacr` registry only |
| UAT | Contributor | `veervrat-uat` resource group |
| UAT | Key Vault Secrets Officer | `veervrat-uat-kv` only |
| UAT | Storage Blob Data Contributor | `tfstate-uat` container only |
| UAT | Reader + AcrPull | `veervratacr` registry |
| production | Contributor | `veervrat-prod` resource group |
| production | Key Vault Secrets Officer | `veervrat-prod-kv` only |
| production | Storage Blob Data Contributor | `tfstate-prod` container only |
| production | Reader + AcrPull | `veervratacr` registry |

Twelve additive assignments; no subscription Contributor/Secrets Officer, shared state access,
User Access Administrator or role-management delegation. Reader at the registry supports
management metadata and existing assignment refresh; pull rights do not grant image publishing.
Build loses the unused UAT-domain lookup: preparation now needs no Azure login or OIDC.

Creating resource groups, registering subscription providers and creating/changing access
grants are explicit maintainer bootstrap operations. Deployment Terraform disables automatic
provider registration. Routine deployments manage existing resources/grants, not access policy.
A feature needing a new role assignment requires maintainer review/apply before routine CD;
an access failure must not be worked around with broad roles. IAM grants remain declarative.

## Candidate verification, before credential cutover

Set non-secret `AZURE_CANDIDATE_CLIENT_ID` and `AZURE_CANDIDATE_PRINCIPAL_ID` on each GitHub
environment. These do not replace the active deployment `AZURE_CLIENT_ID`.
Protected main supports manual CD operations `verify-build`, `verify-uat`, `verify-prod`.
Verification skips deployment preparation/build/deploy jobs; no PR or tag can run these probes.

The verification script validates token client/principal/tenant/audience and expiry, then issues
only GET/HEAD requests: expected registry/group reads, denied other-environment group/state/vault
metadata, denied legacy state and shared GitHub identity metadata, and effective permissions
without role-management writes. It reads vault metadata, **not secret values**, and state blob
headers, **not state contents**. Explicit RBAC errors are required; authentication, firewall,
network and missing-resource errors cannot count as permission denials.

UAT/production also run normally locked read-only Terraform plans with deployed image inputs
pinned. Plans acquire/release temporary state leases; they never apply infrastructure or run
migrations. Private plans/logs are never uploaded. UAT must be clean; production may show only
the known two existing app-config updates verified against the original backend in #350.
These updates are not authorized for apply by the probe.
Terraform's provider refresh necessarily reads private state and managed secret values internally;
these are not manually inspected, printed or uploaded.

Pre-apply verification on 2026-10-11: the normally locked shared plan shows exactly twelve
new `release_identity` role assignments, zero changes/deletions and no legacy-grant mutations.
Local identity/security fixtures pass; all three Terraform configurations validate. Linux/ARM
lock checksums are recorded without changing AzureRM 4.81.0 or Random 3.9.0 versions.

The maintainer authorized temporarily permitting branch `main` in the protected prod
environment for this verification only. Required owner approval and disabled administrator
bypass must remain intact. Record the exact temporary policy ID, run the reviewed probe, then
remove that policy and verify the original prod-* tag-only configuration, even if the probe fails.
This permission test is **not** a production release authorization.

## Current controller and production proof (2026-10-12)

The later owner-approved controller design permanently changed native prod admission to
protected `main`; immutable prod tags are release requests, not executable deployment refs.
The earlier temporary-main/tag-only probe instructions describe the historical cutover stage;
do not restore tag-only policy after a new probe and break the active main controller.
Separate identities, state scopes and retired legacy trust remain active. Production write
verification subsequently passed in deliberate `prod-2026-10-12`, run `38262172088/1`, including
Terraform, migration, exact-digest promotion, private/public outcome and independent read-back.
See [release evidence](release-controls-rollout.md). No broad legacy grants were restored.
Signed attestations are not claimed by this rollout; current record provenance uses protected
workflow/owner evidence, scoped storage and conditional writes, with the cloud-maintainer
trust boundary documented separately. Blob conditional writes are not WORM.

## Historical cutover and retirement checkpoints

1. Review/apply an additive live plan with only the twelve expected assignments; preserve a
   private shared-state backup. Unexpected changes/deletions stop the apply.
2. Run the three candidate probes. A failed probe blocks that context's cutover; do not claim
   production write-path verification from a read-only plan. Real production writes are tested
   only during a deliberate, UAT-approved release, not a permissions experiment.
3. Switch each environment's deployment `AZURE_CLIENT_ID` only after its candidate passes.
   Prove actual build publishing and a healthy UAT deploy with the replacements. Production
   remains approved/tag-only and is not deployed merely to verify the switch.
4. Remove legacy federated trusts and broad assignments only after all replacements pass.
   Remove the repository-level legacy-client fallback; preserve non-secret retirement evidence.
   Verify old credentials no longer provide a bypass and new cross-scope reads remain denied.

Separate identities do not make artifacts immutable: build still has registry publishing
authority, and exact-digest promotion, signed acceptance, image retention and recovery remain
separate release-control work. OpenSpec and development-environment design are out of scope.
