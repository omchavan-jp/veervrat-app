# Terraform state container cutover

Owner: omchavan-jp. Authorization recorded in the maintainer chat on 2026-10-11.
Status: native state migration verified on 2026-10-11; backend configuration merged and CD restored.
PR #350 passed all seven checks and merged at `e4e0a55ca732c3e205401d97b72d547f2eb68c91`.
The CD workflow was restored to its prior `active` state, then a legitimate main UAT
verification run was started: [run 38120027391](https://github.com/omchavan-jp/veervrat-app/actions/runs/38120027391).
Consult its actual job/health-check outcome before claiming end-to-end deployment verification.

## Migration evidence

The owner confirmed no other operator would run Terraform. The prior CD workflow state
was `active`; CD was temporarily disabled after run `38117835338` completed successfully
and no queued/running CD runs remained. Terraform found no destination state in any new
backend before the explicit copy confirmation. State locks were used throughout.

| Root | Destination container | Unchanged key | Serial before → after |
| --- | --- | --- | --- |
| shared | `tfstate-shared` | `shared.tfstate` | 26 → 27 |
| UAT | `tfstate-uat` | `uat.tfstate` | 276 → 277 |
| production | `tfstate-prod` | `prod.tfstate` | 51 → 52 |

All three retain their lineage, full resource data and outputs. Comparison allowed only
the native migration's one-step serial increase and ordering of validation check records;
canonical state content otherwise matched. Provider versions were not upgraded. Private
backups and logs were preserved outside Git. Normally locked shared and UAT post-migration
plans have **no changes** (UAT image set pinned to `92367ab`). Production was pinned to its
existing `3037e87` images: both the original and migrated backends propose the exact same
two in-place app configuration updates, zero additions/deletions. The complete proposed
resource-change objects were compared and matched; these are existing configuration debt,
not a migration effect, and were **not applied**. Backend configuration is merged and
CD is restored; the resumed UAT run above records deployment evidence. No production release occurred.

## Applied foundation

PR #349 merged at `92367abd44ce6f66ef6e5cf39ca367e09da76fd7` after seven successful
checks and the documented owner review exception. The fresh, normally locked saved plan
was applied: **10 additions, zero changes, zero deletions**. This created three staged
identities, their three federated credentials and four private containers. No new roles,
workflow client IDs or state backends were changed. Shared state was backed up privately
before apply. Plans, logs and backups contain sensitive information; never publish them.

## Cutover prerequisites

1. Confirm no queued/running deployment can use the old backend. Pause CD dispatch during
   the cutover, let existing deployments finish, and record the prior workflow state.
   Also coordinate with human operators: workflow suspension does not stop laptop Terraform.
2. Initialize each existing backend with its checked-in provider lock unchanged. Save a
   nonempty private state backup and record lineage, serial and resource inventory.
   Preserve existing Azure blob versions; retain source blobs for controlled recovery.
3. Verify each destination container is private and contains no competing state. Do not
   overwrite an unexpected state, force-unlock a lease or bypass a provider checksum error.

## Migration and verification

Change only `container_name`: shared → `tfstate-shared`, UAT → `tfstate-uat`,
production → `tfstate-prod`; preserve each existing key and storage account.
Use Terraform's native `init -migrate-state` with state locking, not `-reconfigure`.
Explicitly confirm the reviewed source/destination copy. See the
[HashiCorp init reference](https://developer.hashicorp.com/terraform/cli/commands/init).

Pull destination state privately and assert matching lineage and complete resource inventory.
Verify the native migration's serial increment; canonicalize validation-check ordering before
comparison. All other state content must match. Never print secrets. Stop on unexplained differences.
Review a normally locked plan with deployment inputs pinned to the actual deployed image
set; do not apply a default-image plan or treat drift as part of this backend-only change.

Merge the backend configuration through a checked PR before resuming CD. During the
maintenance window, never let old and new backends both become writable active authorities.
After restoration, verify a legitimate UAT deployment uses the new backend. Production
state verification must not create a release tag or deploy production merely as a test.

Existing operator checkouts must fetch the merged backend change and select the already
verified destination with `terraform init -reconfigure`; do **not** repeat the copy from
stale source state. Here reconfiguration is allowed only after the verified native migration,
not as a substitute for migration. Do not run old checkouts or dispatch/re-run workflows
from pre-cutover production tags: those versions still name the original container.
Preserved release tags are historical references, not a safe rollback procedure. The owner
must reject such production approval requests until current-workflow artifact recovery and
scoped RBAC prevent stale-backend access. This is an interim operator restriction, not
a claim that legacy account-wide credentials are technically fenced.

## Recovery and remaining boundary

If cutover cannot complete, keep deployments paused and select a single authoritative
backend using verified lineage/serial. Do not copy a stale backup over newer state.
Retained source state is for controlled recovery only, not an alternative active backend.

Separate containers alone were preparation, not access isolation. The subsequent
[identity cutover](azure-identity-cutover.md) applied container-scoped deployment access,
verified allowed/denied operations, switched client IDs and removed the legacy broad grants/trusts.
The inert identity object was deleted and verified in [focused cleanup](focused-cleanup-2026-10-11.md).
Maintainer state access remains an explicit operator boundary; production write verification
is still reserved for a deliberate UAT-approved release.
