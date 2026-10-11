# PLAN — Release-control foundation

Owner: `omchavan-jp`. Assessed: 2026-10-11.
Authority: [Git and Release Governance](../documentation/25_Git-and-Release-Governance.md).
Status: additive foundation applied 2026-10-11; not a completed security boundary.
PR #349 merged at `92367abd44ce6f66ef6e5cf39ca367e09da76fd7`. A fresh locked saved
plan applied with 10 additions, zero changes/deletions and no new RBAC grants.
State migration and authority cutover remain pending; see
[state migration checkpoints](terraform-state-migration.md).

## Verified starting point

Azure read-back confirmed one `veervrat-github-actions` identity trusted by the build, UAT
and production environments. Its live grants are subscription Contributor, subscription
Key Vault Secrets Officer, account-wide state Blob Data Contributor, registry AcrPush and
User Access Administrator in both application resource groups. Before this iteration,
GitHub environments had no reviewer or ref restrictions. They now have the restrictions
in `.github/environment-policy.json`, verified by API read-back on 2026-10-11.
A production reviewer gate alone cannot isolate this identity.

The existing private `veervrattfstate` account contains the single `tfstate` container.
Blob versioning and 30-day blob soft deletion are enabled. State content was not downloaded
or inspected during the Azure CLI assessment; only resource/permission metadata was read.
Terraform planning necessarily reads the private shared state internally. Save any plan and
diagnostics under restricted local permissions; never commit or upload them as public artifacts.

## This PR: staging, not activation

- Declare three new identities, each trusting only its own existing GitHub environment subject.
- Declare four private containers in the existing account: `tfstate-shared`, `tfstate-uat`,
  `tfstate-prod` and `release-records`.
- Do not grant the new identities any roles. Do not change repository/environment variables,
  current credentials, state backends, account policies, deployment code or deployed resources.
- Do not remove the legacy identity or its grants. Existing access remains broad until cutover.
- Keep destructive lifecycle guards on new identities and containers. These are Terraform
  configuration guards, not immutable-storage guarantees or protection against an Azure admin.

Expected staged footprint: three identities, three federated credentials and four containers.
Validate and review an actual plan before applying; an expected count is not live-plan evidence.
No production tag, deployment or permission-change test is authorized by this PR.

Assessment verification: Terraform 1.15.8, pinned AzureRM 4.81.0, formatting and validation
passed. A private, read-only observation plan showed exactly 10 additions, zero changes and
zero deletions, with no RBAC changes and four private containers. The observation used
`-lock=false` and was not applied; regenerate a fresh normally locked plan before activation.
Two existing deprecation warnings remain in the shared configuration. CI now repeats static
validation with `-backend=false`, no Azure login and no extra token permissions.

## Activation sequence and checkpoints

1. Protect privileged GitHub environments against untrusted refs. Build/UAT must accept only
   intended main workflows; production must require the owner, authorized release tags and
   no administrator approval bypass. Do not let a branch-dispatched workflow obtain privileged
   credentials. Configured now: build permits main and prod-* tags (transitional existing
   tag preparation); UAT permits main; prod permits prod-* tags with owner review and
   admin bypass disabled. Owner self-review is allowed. Native approval behavior has not
   been production-tested. Main ancestry/UAT acceptance checks remain to be implemented.
2. Review/apply the additive shared foundation. Existing resources must have no unintended
   changes or destruction. Do not infer that an infrastructure-file merge applies shared Terraform.
3. Back up/version-pin the current state under restricted operator access; inventory keys and
   select a deployment-free migration window. Copy/migrate each environment into its own container,
   verify lineage/serial and a no-unintended-change plan, then change backend configuration.
   Retain source state for controlled recovery; prevent concurrent use of old and new backends.
   The no-backup authorization for historical Git branches does not apply to Terraform state.
4. Assign scoped roles, then switch environment-level client IDs. Build gets registry publishing
   authority, not state/secrets/production Contributor. UAT gets only its own resource, vault and
   state scopes. Production gets only its own scopes behind approval. Shared infrastructure and
   cross-scope role creation remain an explicit operator operation unless narrowly delegated.
   Review actual conditional RBAC needs before assigning role-management authority; do not copy
   subscription Contributor/Secrets Officer or the old broad grants onto the new identities.
5. Verify allowed operations and denied cross-environment state, vault, production and identity
   administration operations without making destructive production requests. Only then remove
   old federated trusts/grants and verify they no longer provide a bypass. Do not claim isolation
   while any legacy build/UAT path retains production authority.
6. Implement trusted deployment snapshots and owner-authorized UAT acceptance, then exact-digest
   production promotion, release eligibility, approval, global production serialization and recovery.

## Durable records and provenance

Recommended storage: private, portable JSON records in `release-records`, rather than expiring
workflow artifacts or editable release descriptions. Reuse the existing account; add no new
paid GitHub product. Normal Azure storage/operation charges still apply. Provider replacement
is another private object store with the same JSON and verification boundary, not application changes.

Use unique deployment/acceptance identifiers, create-only writes and retained records. Versioning
and soft deletion help recovery but are not permanent immutability. No locked retention policy
or legal hold is introduced here. Confirm lifecycle filters cannot expire base records before use.

Acceptance must bind the full commit, successful main checks, actual deployed image set (including
mixed-source web-only deployments, migration and backup images), digests, deployment run/attempt,
owner identity, timestamp and meaningful test notes. Never put passwords, state content, connection
strings or user data in records or public release notes.

Require verifiable workflow provenance for snapshots/acceptance (for example GitHub-native
artifact attestations), checking the subject digest, trusted repository/workflow/ref and authorized
actor. A blob field claiming `actor=owner` is not proof; do not trust unsigned editable JSON.
Attestation implementation/action allowlist changes require their own tested PR. See
[GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).
Public-repository attestations use public transparency infrastructure: attest the record digest
and workflow provenance, never embed private notes or secret material in a public predicate.

Production must validate the accepted set before obtaining production-capable credentials,
show the release summary, require approval and deploy those exact digests without rebuilding.
Acceptance is a recorded owner decision, not proof of human testing; health/smoke checks supplement it.
Automatically create/update the public GitHub release evidence, keeping private/sensitive notes out.

## Verification still required

- Post-cutover live plans and verification; foundation plan/apply authorization is complete.
- Ref restrictions, conditional/scoped RBAC, state migration and denied-operation evidence.
- Snapshot/acceptance provenance, durable record validation and artifact retention strategy.
- Exact-digest Terraform/composite deployment inputs for all affected images/jobs.
- Production approval/release eligibility tests without implicit production changes.
- Recovery runbook and schema compatibility assessment before a deliberately authorized rollback.

OpenSpec, organization transfer, new development environments and application schemas are outside scope.
