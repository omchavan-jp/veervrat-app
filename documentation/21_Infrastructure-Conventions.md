# 21 — Infrastructure Conventions

How we run infrastructure-as-code for Veervrat. Read this before touching anything
under `infra/terraform/`.

Companion docs: `10_Platform-Engineering-Standard.md` (application libraries and
constants) · `../../azure-account-facts.md` (account IDs, access, guardrails — the
source of truth for *what exists*; this doc covers *how we change it*).

---

## 1. Ground rules

1. **Everything in Terraform.** Any resource created by clicking in the Azure Portal
   is invisible to the next person and un-reviewable. The only exceptions are the two
   documented bootstrap resources in §4.
2. **`plan` before `apply`, every time.** `plan` is read-only. Read its summary line
   (`N to add, N to change, N to destroy`) before proceeding. A non-zero *destroy*
   count you did not expect means stop, not scroll past.
3. **`terraform fmt -recursive` before committing.** Same standing as `prettier` on
   application code; formatting drift is not a matter of taste here.
4. **Never commit state.** State lives in the remote backend (§4). `.gitignore`
   covers `*.tfstate`, `.terraform/`, and `*.tfplan`.
5. **Commit `.terraform.lock.hcl`.** It pins provider versions so a run next month
   behaves like today's.

---

## 2. Naming

Azure enforces different rules per resource type, so names are *not* stylistically
consistent — and should not be forced to be:

| Resource | Rule | Ours |
|---|---|---|
| Storage account | lowercase alphanumeric only, 3–24 chars — **no hyphens** | `veervrattfstate` |
| Container registry | alphanumeric only, 5–50 chars — **no hyphens** | `veervratacr` |
| Key Vault | alphanumerics + hyphens, 3–24 chars | `veervrat-kv` |
| Resource group | permissive | `veervrat-shared`, `veervrat-uat`, `veervrat-prod` |

Prefix everything with `veervrat`. Use hyphens where the resource type allows them.

**Tags** — every resource carries `project`, `environment`, and `managed-by`. The
`managed-by` value is meaningful: `terraform` for normal resources,
`manual-bootstrap` for the two exceptions in §4.

---

## 3. Layout

```
infra/terraform/
  bootstrap/     One-time setup script. Already run; not part of normal workflow.
  envs/
    shared/      Cross-environment: DNS zone, container registry, Key Vault.
    uat/         Phase 2.
    prod/        Phase 2.
```

One directory per environment, each with **its own state file**. This is the isolation
boundary: a mistake while applying UAT cannot reach prod, because Terraform in that
directory has no knowledge of prod's resources. Environments are separated by resource
group within a single subscription (decision D12).

---

## 4. The two hand-created resources — and why

Everything else is Terraform-managed. These two are not, deliberately:

**The state storage account (`veervrattfstate`).** Chicken-and-egg: Terraform cannot
create the thing that stores its own record of what it created. Created once by
`bootstrap/create-state-backend.sh`, which is idempotent and safe to re-run.

**The DNS zone (`veervrat.jnanaprabodhini.org`).** Hand-created 2026-08-15 to unblock
the NS delegation request to JP (a slow human round-trip via Rahul → Shantanu) before
Terraform existed for this project. **Imported** into state on 2026-08-16 — Terraform
tracks it but did not create it.

### The DNS rule

**Never destroy and re-create the DNS zone.** Azure assigns nameservers per zone; a new
zone gets different ones, invalidating the delegation JP has published and requiring the
whole request again.

This is enforced in code, not just documented — `dns.tf` carries
`lifecycle { prevent_destroy = true }`, so `terraform destroy` fails loudly instead of
succeeding quietly. Verified: `terraform plan -destroy` errors with
*"Instance cannot be destroyed."*

If `plan` ever shows a change to `azurerm_dns_zone.veervrat`, stop and diagnose. Do not
let Terraform "resolve" the diff.

---

## 5. Secrets and access

- **No static keys anywhere.** State access uses Azure AD identity
  (`use_azuread_auth = true`), not a storage account key. The container registry has
  `admin_enabled = false`; CD will authenticate via managed identity.
- **Key Vault uses RBAC authorization**, not the legacy access-policy model — one
  permission system instead of two.
- **Subscription Owner does not grant access to secret values.** With RBAC
  authorization on, data-plane access needs its own role assignment (`Key Vault
  Administrator`). This surprises people; it is not a misconfiguration.
- **Grant access to named principals, never to `data.azurerm_client_config.current`.**
  Deriving the principal from whoever runs Terraform means the assignment silently
  follows the operator — a second admin running `apply` would replace the first's
  access. Use the `key_vault_administrators` variable.
- Object IDs, tenant IDs and subscription IDs are **identifiers, not credentials**, and
  belong in version control. Passwords, keys and connection strings never do.

---

## 6. Importing existing resources

When a resource already exists and must come under Terraform management without being
recreated:

```bash
# 1. Write the resource block matching the existing resource
# 2. Get its ID — note Azure CLI returns lowercase type segments, but Terraform
#    requires the canonical casing (e.g. `dnsZones`, not `dnszones`)
az network dns zone show -g <rg> -n <name> --query id -o tsv

# 3. Import
terraform import <address> "<resource-id>"

# 4. THE CHECK THAT MATTERS: plan must show zero changes for that resource.
terraform plan
```

A non-empty diff after import means the config does not match reality. Fix the config
to match what exists — do not apply and let Terraform mutate the resource into shape.

---

## 7. Renaming resources in state

Changing a resource's Terraform address (e.g. converting to `for_each`) would normally
destroy and re-create it. Use a `moved` block instead — declarative, reviewable, and
shows up in `plan` as a move with `0 to destroy`:

```hcl
moved {
  from = azurerm_role_assignment.current_user_kv_admin
  to   = azurerm_role_assignment.key_vault_admins["om"]
}
```

Delete the block once applied.

---

## 8. Review findings — 2026-08-16

Recorded so the same mistakes are not repeated. All three were found reviewing Phase 1
and have been fixed.

| # | Finding | Lesson |
|---|---|---|
| 1 | The DNS "never destroy" rule existed only as a comment — no `prevent_destroy`. | A rule that matters enough to write down is a rule worth enforcing in code. Comments do not stop `terraform destroy`. |
| 2 | Key Vault admin bound to `data.azurerm_client_config.current.object_id`, so access would follow whoever ran Terraform. | Access should never depend on who typed the command. Name principals explicitly. |
| 3 | `terraform fmt` was never run; three files had misaligned assignments. | IaC gets the same formatting discipline as application code. |

---

## 9. Deferred — revisit before public launch

Tracked in `../../infra-budget-log.md`; repeated here because they are infrastructure
decisions with a deadline.

- **VNet + private endpoints** for Postgres/Redis/Key Vault. Today these are reachable
  over the public internet and protected by identity + firewall + TLS, which is
  appropriate for beta. ~$7/mo per endpoint.
- **Key Vault `purge_protection_enabled`** is currently `false`. Turning it on makes the
  vault permanently undeletable, so it stays off while the setup is still changing.
  Reconsider before the vault holds production secrets.
  (`soft_delete_retention_days` is now `90` — see §10.)
- **Container registry cleanup.** Automatic retention policies are **Premium-tier only**
  and we are on Basic, so the path is a scheduled `acr purge` task (supported on Basic)
  keeping roughly the last 10 tags. Not yet needed — zero images pushed. Becomes
  relevant as soon as CD pushes on every merge. Basic includes 10 GB.
- **Budget → action group → automation hard stop.** MCA subscriptions have no spending
  limit; see `azure-account-facts.md` §4.
- **Per-environment Key Vaults.** The shared vault is the wrong home for
  environment-specific secrets — see §10.

---

## 10. Immutable settings — get them right at creation

Some Azure properties cannot be changed after a resource is created. Terraform's `plan`
does not always warn you: for `soft_delete_retention_days` it cheerfully planned an
in-place update, and only the **apply** failed with *"once `soft_delete_retention_days`
has been configured it cannot be modified"*. The fix was to replace the vault
(`terraform apply -replace=...`), which was free only because the vault was still empty.

**Lesson: a clean `plan` is not proof a change is possible.** For settings that look
foundational (retention windows, redundancy, tier-defining options), assume immutable
and set them correctly at creation, while the resource is empty and replacement is free.

Settled 2026-08-16: `soft_delete_retention_days = 90` — the maximum, and Azure's
default. Soft-deleted vaults cost nothing, so a shorter window buys nothing and only
makes a mistake unrecoverable sooner.

### Sharing across environments — decided per resource, not by default

`shared` is not automatically the right home. The test is **what a compromise or mistake
in UAT could reach in prod**:

| Resource | Shared? | Why |
|---|---|---|
| Container registry (`veervratacr`) | **Yes — correct** | Promotion requires the *same image* be tested in UAT and shipped to prod. Separate registries mean either rebuilding (you'd ship bits you never tested) or copying between registries for no benefit. Images are artifacts, not secrets. |
| State storage account (`veervrattfstate`) | **Account shared, state files separate** | The isolation boundary is the state *file*, not the account — `shared.tfstate`, later `uat.tfstate`, `prod.tfstate`. Terraform in one env cannot see another's resources. Note RBAC is granted at account scope, so anyone who can write UAT state can write prod state; revisit with separate containers when more than one person deploys. |
| Key Vault (`veervrat-kv`) | **No — currently wrong, fix in Phase 2** | Secrets are exactly where a shared store breaks the environment boundary: a compromised or misconfigured UAT app could read the production database password. Per D11 beta testers with real personal data live on prod, so those credentials protect real users. |

**Phase 2 action:** add `veervrat-uat-kv` and `veervrat-prod-kv` in their own resource
groups. Keep `veervrat-kv` only for genuinely cross-environment secrets. Key Vault is
priced per operation, so additional vaults cost effectively nothing.
