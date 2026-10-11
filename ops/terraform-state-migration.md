# Terraform state container cutover

Owner: omchavan-jp. Authorization recorded in the maintainer chat on 2026-10-11.
Status: native state copies verified on 2026-10-11; backend PR/checks and CD restoration pending.

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
not a migration effect, and were **not applied**. Backend-PR merge and CD restoration
remain pending. No production release occurred.

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

## Recovery and remaining boundary

If cutover cannot complete, keep deployments paused and select a single authoritative
backend using verified lineage/serial. Do not copy a stale backup over newer state.
Retained source state is for controlled recovery only, not an alternative active backend.

Separate containers are preparation, not access isolation: the legacy identity still has
account-wide state access and broad production authority. Scoped RBAC, environment client-ID
cutover and allowed/denied-operation tests remain required before retiring that identity.
