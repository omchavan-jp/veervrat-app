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
- **Key Vault `purge_protection_enabled`** is currently `false` and
  `soft_delete_retention_days` is `7` (the minimum; default is 90). Turning purge
  protection on makes the vault permanently undeletable, so it is off while the setup
  is still changing. Both should be reconsidered before the vault holds production
  secrets — note that changing the retention window **replaces the vault**, so it is
  cheapest to change while the vault is empty.
- **Container registry cleanup.** Automatic retention policies are **Premium-tier only**
  and we are on Basic, so the path is a scheduled `acr purge` task (supported on Basic)
  keeping roughly the last 10 tags. Not yet needed — zero images pushed. Becomes
  relevant as soon as CD pushes on every merge. Basic includes 10 GB.
- **Budget → action group → automation hard stop.** MCA subscriptions have no spending
  limit; see `azure-account-facts.md` §4.
