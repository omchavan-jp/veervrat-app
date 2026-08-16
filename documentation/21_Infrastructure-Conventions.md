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
| Key Vault | alphanumerics + hyphens, 3–24 chars | `veervrat-uat-kv` |
| Resource group | permissive | `veervrat-shared`, `veervrat-uat`, `veervrat-prod` |

Per-environment resources are named `veervrat-<env>-<thing>` (e.g. `veervrat-uat-psql`,
`veervrat-uat-redis`) — see §11 for the module that generates these.

Prefix everything with `veervrat`. Use hyphens where the resource type allows them.

**Tags** — every resource carries `project`, `environment`, and `managed-by`. The
`managed-by` value is meaningful: `terraform` for normal resources,
`manual-bootstrap` for the two exceptions in §4.

---

## 3. Layout

```
infra/terraform/
  bootstrap/     One-time setup script. Already run; not part of normal workflow.
  modules/
    environment/ One environment's stateful core — Key Vault, Postgres, Redis, Container
                  Apps Environment. Called by envs/uat and (Phase 2B) envs/prod with a
                  different `environment` value. See §11.
  envs/
    shared/      Cross-environment: DNS zone, container registry.
    uat/         Calls modules/environment. Landed 2026-08-16 (Phase 2A).
    prod/        Phase 2B — will call the same module.
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

### ⚠️ Secrets are stored in plaintext in the Terraform state file

Unavoidable, and frequently misunderstood. Terraform must remember what it created, so
`random_password` results and every `azurerm_key_vault_secret` value sit in cleartext in
the state file — verified, not assumed. Marking a variable `sensitive` only hides it from
*console output*; it changes nothing about state.

The practical consequences:

- **Anyone who can read the state file has every secret for that environment.** Treat
  read access to `veervrattfstate` as equivalent to Key Vault admin.
- This is why state lives in a private storage account behind Azure AD RBAC, with no
  account keys, and never in git.
- Blast radius is currently wider than ideal: the Blob Data Contributor role is granted at
  **storage-account scope**, so anyone who can read UAT state can also read prod state once
  it exists. Narrow this to per-container scope when a second person deploys.
- Rotating a secret means rotating it in Azure *and* accepting the old value remains in
  state history (blob versioning keeps 30 days of prior versions).

What this does buy: no secret is ever typed by a human, written into a `.tf` file, or
committed to git — the app reads everything from Key Vault at runtime.

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
- **Postgres/Redis firewall is currently "allow all Azure services," not per-resource.**
  Same VNet dependency as above — narrowing this needs Container Apps to have a stable
  outbound IP, which needs VNet integration.

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
| Key Vault | **No** | Secrets are exactly where a shared store breaks the environment boundary: a compromised or misconfigured UAT app could read the production database password. Per D11 beta testers with real personal data live on prod, so those credentials protect real users. |

**Resolved 2026-08-16 (Phase 2A):** the original shared `veervrat-kv` was deleted (confirmed
0 secrets first) and replaced with a per-environment vault created by the module in §11 —
`veervrat-uat-kv` now, `veervrat-prod-kv` with Phase 2B. Key Vault is priced per operation,
so multiple vaults cost effectively nothing.

---

## 11. The `environment` module (Phase 2A, 2026-08-16)

`modules/environment/` — one environment's stateful core: resource group, Key Vault,
Postgres Flexible Server, Redis, and an empty Container Apps Environment. Parameterized by
`environment` (`"uat"` / `"prod"`) so Phase 2B is `envs/prod/main.tf` calling the same
module, not a second hand-written copy that can quietly drift from UAT's.

**Deliberately not included:** Blob Storage (the app's upload code speaks the S3 protocol
via `@aws-sdk/client-s3`, which Azure Blob does not — needs a small SDK swap first) and the
actual `web`/`api` Container Apps (need a real image in ACR, which needs the CD pipeline).
The Container Apps *Environment* — the empty execution shell — is created now so CD only
has to deploy into it, not build it.

Generated secrets (`database-url`, `redis-url`, the Postgres admin password) are written
straight to the environment's Key Vault by Terraform — never typed by a human, never
appear in a `.tf` file, never committed anywhere.

### Two things discovered mid-build, not anticipated by the target architecture doc

**Azure retired "Azure Cache for Redis" while this was being built.** The `apply` for the
classic `azurerm_redis_cache` resource failed outright: *"Azure Cache for Redis is
retiring, create Azure Managed Redis instance instead."* Its literal replacement resource,
`azurerm_redis_enterprise_cluster`, turned out to be **also** deprecated and rejects the
new SKU names — the actual current resource is `azurerm_managed_redis`, a different shape
(one resource with a nested `default_database` block, not two separate resources). Verified
pricing directly against Azure's live retail pricing API (`prices.azure.com`) rather than
trusting either the marketing pricing page (shows no numbers) or a stale assumption:
`Balanced_B0` is $0.017/hr (~$12/mo) in `centralindia` — cheaper than the ~$16/mo originally
budgeted for the tier this replaces.

**Lesson:** for external managed services, `plan`/`apply` failing with a clear error is the
system working correctly, not a bug in our config — treat it as a signal to re-verify the
target architecture doc's assumptions against current reality, not to route around.

**Postgres reported drift on the very next `plan` after creation.** Azure auto-assigns an
availability zone at creation; our config never set one, so Terraform read that as "should
be null" and wanted to change it back on the next run — a real if low-risk diff (in-place
update, not destroy/recreate). Fixed by reading the actual assigned zone
(`az postgres flexible-server show --query availabilityZone`) and pinning it in config.

**Lesson:** the same principle as §10 in reverse — some fields Azure assigns automatically
that your config didn't request. Pin them once observed rather than leaving a plan that
"corrects" something you never intended to change.

---

## 12. Review findings — Phase 2A (2026-08-16)

Found reviewing Phase 2A. All fixed; recorded so the reasoning survives.

| # | Finding | Fix / lesson |
|---|---|---|
| 1 | `postgres.tf` claimed secrets were "never committed anywhere" — but they sit in plaintext in state. | Corrected the comment and documented the real rule in §5. **A reassuring comment that is factually wrong is worse than no comment**, because someone will make an access decision based on it. |
| 2 | Redis `eviction_policy = "NoEviction"`, justified as protecting counters — it does the opposite. A full cache starts failing writes, and `auth.service.ts` fails *open* on Redis errors, silently disabling brute-force protection. | Changed to `AllKeysLRU`. **Check what your error handling actually does before choosing a failure mode**; "fail loudly" is only safe if something is listening. |
| 3 | `prevent_destroy` applied to UAT's database, contradicting D11's "UAT is disposable". | **Not fixable as intended** — Terraform rejects variables in `prevent_destroy` ("Variables may not be used here"), verified. Left literal `true`; tearing down UAT requires commenting the block out, which is an acceptable speed bump in front of dropping a database. |
| 4 | Storage auto-grow disabled: a full 32 GB disk would stop Postgres accepting writes, with no warning. | Enabled `auto_grow_enabled`, plus a `storage_percent > 80%` metric alert (§13) since auto-grow trades an outage risk for a cost risk. Also made `backup_retention_days` a variable — prod will want more than UAT's 7. |

---

## 13. Alerting

Infrastructure alerts go to an Azure Monitor **action group** per environment
(`veervrat-<env>-ops`), defined in `modules/environment/monitoring.tf`. Metric alert rules
cost roughly $0.10/month each.

**Recipients must be `@jnanaprabodhini.org` addresses** (Google Workspace — what people
actually read). The `@jppune.onmicrosoft.com` mailboxes exist but nobody monitors them, so
an alert delivered there is functionally lost. See `azure-account-facts.md` §6.

Current rules:

| Alert | Threshold | Why |
|---|---|---|
| `veervrat-<env>-psql-storage` | `storage_percent` > 80%, evaluated hourly | Auto-grow means a filling disk raises the bill permanently rather than causing an outage — this surfaces it as a warning instead of an invoice surprise. |

**Prefer an alert over a note in a document.** A documented intention to "keep an eye on
storage" decays; an alert does not.

---

## 14. Building and shipping images (Phase 2B, 2026-08-16)

### Build in Azure, not on your machine

Use `az acr build`, which uploads the context and builds **inside Azure**:

```bash
SHA=$(git rev-parse --short HEAD)
az acr build --registry veervratacr \
  --image "veervrat-api:$SHA" --image "veervrat-api:latest" \
  --file apps/api/Dockerfile .
```

This is not a convenience — it's correctness. Development machines here are **arm64**
(Apple silicon) and Container Apps runs **amd64**. A local `docker build` produces an image
that fails to start in Azure with an architecture error that reads like a corrupt image.

Two operational notes:
- **ACR runs are server-side.** Killing the local CLI does *not* stop the build; it keeps
  running and consuming the queue. Cancel properly:
  `az acr task cancel-run --registry veervratacr --run-id <id>`.
- List runs with `az acr task list-runs --registry veervratacr -o table`.

### Keep the build context small — check it, don't assume

The build context is uploaded to Azure on every build. `.dockerignore` **must** exclude
`infra/`, because Terraform's `.terraform/` directories hold ~220 MB of provider plugins
*per environment directory*.

Missing that, the context was **139 MB**; with it, **0.3 MB** — a 460× difference. The
symptom was not an error but builds that appeared to hang during upload, which is a far
harder thing to diagnose than a failure.

**Verify rather than trust the file.** `az acr build` prints the archive path; check it:
```bash
ls -la /var/folders/**/build_archive_*.tar.gz   # macOS temp dir
```
Anything above a few MB for this repo means something large is leaking in.

### `NEXT_PUBLIC_*` is build-time — declaring it in the Dockerfile is not optional

Next.js inlines `NEXT_PUBLIC_*` into the browser bundle at build time. Passing
`--build-arg` only works if the Dockerfile also declares `ARG` **and** `ENV` for it.
Otherwise Docker silently ignores the argument — no warning, no failure, just a value that
never arrives. `NEXT_PUBLIC_SITE_URL` was documented as build-time, passed as a build arg,
and silently dropped this way for months.

Corollary: **never default a public URL to a real deployed host.** The fallback should be
`localhost`, because a stale-but-plausible domain fails invisibly while localhost in
production is obvious on sight.

### Container App URLs are predictable before the apps exist

`azurerm_container_app_environment` exposes `default_domain`, and app URLs are
`https://<app-name>.<default_domain>`. That resolves the chicken-and-egg where web must be
*built* knowing the api's URL:

```bash
az containerapp env show -n veervrat-<env>-cae -g veervrat-<env> \
  --query "properties.defaultDomain" -o tsv
```

### Use user-assigned identities for Container Apps, not system-assigned

A system-assigned identity does not exist until the app is created — but the app cannot
pull its image or read its secrets without role grants, and those grants need the
identity's `principal_id`. That is a real dependency cycle Terraform refuses to resolve.

Creating `azurerm_user_assigned_identity` as its own resource breaks it:
**identity → role grants → app.** One identity per app, so web (which needs no secrets)
never holds Key Vault access.

### The runtime image cannot run migrations

`prisma` is a devDependency and is pruned out of the runtime image, which therefore ships
the migration *files* but not the tool that applies them. Migrations run from the **build**
stage image instead. Keeping the runtime image lean is worth this split: with
scale-to-zero, image size is cold-start latency.

### Build every image for a release from ONE commit

Hit on the first manual deploy: committing between image builds produced three images
tagged with three different SHAs (`veervrat-api:af20773`, `veervrat-web:1013364`, …), which
quietly breaks the "one SHA = one release, promote don't rebuild" model — there is no single
tag to deploy or to promote to prod.

Two things follow:

1. **`az acr build` uploads the working tree, not a commit.** The SHA in the tag is a label
   you choose; nothing enforces that it matches what was uploaded. Build from a clean tree
   and label with `git rev-parse --short HEAD`, or the label is fiction.
2. **Recovering is cheap only if you can prove the content is identical.** Compare what
   changed against the build context, not the whole repo:
   ```bash
   git diff --name-only <built-at-sha> HEAD | grep -vE "^(infra/|documentation/|.*\.md$)"
   ```
   Empty output means the image is content-identical and can be retagged instead of rebuilt:
   ```bash
   az acr import --name veervratacr \
     --source veervratacr.azurecr.io/<repo>:<old> --image <repo>:<new> --force
   ```
   Non-empty means rebuild — do not retag and hope.

CD avoids this by construction: one workflow run, one checkout, one SHA, all images.

### The image must exist in ACR *before* `terraform apply`

Made this mistake on the first deploy despite having written the rule down an hour earlier.
Applying while the image was still building failed with:

```
Failed to provision revision for container app 'veervrat-uat-api'.
'template.containers.api.image' is invalid:
MANIFEST_UNKNOWN: manifest tagged by "6ead179" is not found
```

Two things worth knowing:

- **The failure is safe and partial.** Everything else in the plan (identities, role
  grants, the other app, the migration job) was created; only the one resource whose image
  was missing failed. Re-running after the image lands completes it. Terraform's partial
  apply is doing its job here — no cleanup needed.
- **Waiting on the ACR *task* is not the same as waiting on the *tag*.** Poll for the tag
  itself, which is the thing Container Apps actually resolves:
  ```bash
  until az acr repository show-tags --name veervratacr --repository veervrat-api \
        -o tsv | grep -q "$SHA"; do sleep 20; done
  ```

CD must enforce build → verify tag → migrate → deploy as ordered steps, because the
ordering is easy to get wrong by hand even when you wrote the rule.

#### A failed Container App creation leaves an orphan that blocks the retry

The `MANIFEST_UNKNOWN` failure above had a second-order effect. Azure created the Container
App resource and *then* failed to provision a revision for it, so the app existed in a
`Failed` state — but never entered Terraform state, since the create errored. The next
apply then refused to proceed:

```
a resource with the ID ".../containerApps/veervrat-uat-api" already exists -
to be managed via Terraform this resource needs to be imported into the State
```

Two ways out. **Check what the orphan actually is before choosing:**

```bash
az containerapp show -n <app> -g <rg> \
  --query "{state:properties.provisioningState, revisions:properties.latestRevisionName, fqdn:properties.configuration.ingress.fqdn}"
```

- **No FQDN and no revisions** ⇒ it never served traffic and holds nothing. Delete it
  (`az containerapp delete -n <app> -g <rg> --yes`) and re-apply. This is the normal case
  for a failed first create.
- **Otherwise** ⇒ it is real and possibly serving. `terraform import` it instead, then let
  the next plan reconcile it. Never delete an app that has live revisions to fix a state
  problem.

The general shape is worth remembering: *one* out-of-order step (deploying before the image
existed) produced a failed resource, which produced a state conflict, which needed manual
cleanup. That cascade is the argument for CD — not that a human cannot follow the order,
but that a human following it by hand will eventually not.

### Azure Postgres requires extensions to be allow-listed at the server level

The single most valuable thing the first manual deploy surfaced. 21 migrations applied
cleanly, then:

```
extension "pg_trgm" is not allow-listed for users in Azure Database for PostgreSQL
```

Being database admin is *not* sufficient — Flexible Server gates `CREATE EXTENSION` behind
a server parameter. Managed in Terraform:

```hcl
resource "azurerm_postgresql_flexible_server_configuration" "azure_extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "PG_TRGM"
}
```

Keep it in sync with the migrations:
```bash
grep -rhoiE "CREATE EXTENSION[^;]*" apps/api/prisma/migrations/ | sort -u
```

**A failed migration blocks every later one until a human resolves it.** Prisma records the
failure (`P3018`) and refuses to proceed — correctly, since it cannot know whether the
partial migration was rolled back. Recovery is a deliberate override rather than a retry:

```bash
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true" \
  -var='migrate_command=migrate resolve --rolled-back <migration_name>'
az containerapp job start -n veervrat-<env>-migrate -g veervrat-<env>
# then re-apply with the default migrate_command and run again
```

This is why the job has `replica_retry_limit = 0`. An automatic retry would have re-run a
migration whose failure state nobody had assessed.

### Seed is a job, not a migration

Reference content (virtues, weaknesses, sentences…) is seeded by a separate one-off job, not
by a Prisma migration. Migrations are schema — one-shot, forward-only, uneditable once
applied. Seed is content — idempotent upserts that must stay re-runnable, changing on a
product cadence rather than an engineering one. Sharing one mechanism between two different
lifecycles means every content fix becomes an unrepeatable schema change.

It reuses the migration job's machinery (build-stage image, managed identity, manual
trigger) with a different command — `az containerapp job start` accepts `--command`,
`--args`, `--image` and `--env-vars` per execution, so one job definition serves both.

That same `--image` override is what makes the **build → migrate → deploy** order
enforceable in CD: the migration can run on the *new* image before Terraform updates the
apps, without needing a second `terraform apply` or a `-target` hack.

### GitHub → Azure auth uses OIDC — there is no stored secret

`infra/terraform/envs/shared/github-oidc.tf` creates a user-assigned managed identity with
**federated credentials**. GitHub mints a short-lived token describing the workflow run
(repo + branch/tag/environment); Azure trusts that issuer for specific subjects and exchanges
it for an access token. Nothing long-lived lives in GitHub — no client secret, no publish
profile, nothing to rotate or leak.

Repository **variables** (not secrets — they are identifiers): `AZURE_CLIENT_ID`,
`AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

Trusted subjects must match GitHub's token **exactly**. A mismatch fails login with a
generic *"no matching federated identity record found"*, so keep them aligned with the
workflow's triggers and environment names.

What CI can and cannot do, deliberately: Contributor at subscription scope (it creates
resource groups, so a narrower scope would not work) plus AcrPush, Storage Blob Data
Contributor on the state account, and Key Vault Secrets Officer. **Contributor cannot grant
roles** — CI can deploy infrastructure but cannot widen anyone's access, including its own.

Note the recurring Azure distinction: *Contributor covers the control plane but not data*.
Blob and Key Vault each need their own data-plane role — the same trap that catches people
expecting subscription Owner to read secrets.

### Environment protection rules need a paid plan on private repos

Attempting to add a required reviewer returns:

```
422 Failed to create the environment protection rule.
Please ensure the billing plan supports the required reviewers protection rule.
```

Free plan + private repo = no protection rules. **The prod gate is therefore the tag
itself**, which is defensible: pushing `prod-YYYY-MM-DD` is deliberate and traceable, and a
self-approval prompt is a rubber stamp for a single maintainer. The `prod` environment still
exists and still scopes the OIDC subject — it just carries no gate.

Revisit if a second maintainer joins, or when the repo moves to an organisation.
