# 21 — Infrastructure Conventions

How we run infrastructure-as-code for Veervrat. Read this before touching anything
under `infra/terraform/`.

Companion docs: `10_Platform-Engineering-Standard.md` (application libraries and
constants) · `../ops/azure-account-facts.md` (account IDs, access, guardrails — the
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
the NS delegation request to JP (a slow human round-trip via Rahul → Shantanoo) before
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

Tracked in `../ops/infra-budget-log.md`; repeated here because they are infrastructure
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

### Build caching — and a correction to "always build in Azure"

**`az acr build` provides no layer caching and no way to enable it.** Its flag list has
neither `--cache-from` nor `--no-cache`; there is no cache control at all. Confirmed
empirically on our own runs: the api image took **4m16s** cold and **4m20s** on a rebuild of
near-identical content. Every build redoes `pnpm install`, `prisma generate` and `tsc` from
scratch, ×3 images per deploy.

The Dockerfiles are already structured for caching (a `deps` stage keyed on the lockfile) —
nothing was reusing those layers between runs.

**The correction:** §14 above says "build in Azure, not on your machine, because dev machines
are arm64 and Container Apps is amd64." That reasoning is right for a *laptop* and wrong for
*CI*. **GitHub-hosted `ubuntu-latest` runners are already amd64**, so building there is
natively the correct architecture — no QEMU, no emulation, no mismatch. The rule should have
been "never build on an arm64 machine", not "always build in Azure".

So the two contexts differ:

| Context | Build with | Why |
|---|---|---|
| Local / ad-hoc (arm64 Mac) | `az acr build` | correct architecture without emulation; cache is not worth the complexity for a one-off |
| CI (amd64 runner) | `docker/build-push-action` + registry cache | already the right architecture, and gains real layer caching |

**Lesson worth generalising:** a rule justified by one constraint (CPU architecture) should
not be applied where that constraint does not hold. When writing a convention, record *why*
— it is the only way a future reader can tell whether it still applies.

### Azure's OIDC token expires in ~5 minutes — long jobs outlive their own credentials

The first CD run failed like this:

```
AADSTS700024: Client assertion is not within its valid time range.
Current time: 02:24:23, assertion valid from 02:11:29, expiry 02:16:29
```

`azure/login` exchanges a GitHub OIDC assertion with a **~5 minute** validity. A job that
runs longer than that loses Azure auth partway through — the early steps succeed, a later
one fails with what looks like an unrelated error. Here all three images built fine; only
the verification step 13 minutes in failed.

**Structure jobs so each starts with a fresh login**, rather than trying to extend one:
- A cheap `prepare` job resolves shared values (SHA, environment domain) and passes them as
  outputs.
- Each build runs as its own matrix job with its own `azure/login`.
- Deploy jobs likewise log in at their own start.

Parallel matrix jobs are shorter *and* independently authenticated, so this fixes the
credential problem and the wall-clock problem with one change.

### A guard that misreports why it failed is worse than no guard

The same run surfaced a bug in the tag check I had written:

```bash
az acr repository show-tags ... | grep -qx "$SHA" || { echo "not found"; exit 1; }
```

When the token expired, `az` failed, the pipe produced nothing, `grep` found nothing, and the
guard announced **"veervrat-api:dbb563b not found"** — for an image that was sitting in the
registry. It sent the investigation in exactly the wrong direction.

**Always distinguish "the check could not run" from "the check found a problem":**

```bash
if ! TAGS=$(az acr repository show-tags ... 2>&1); then
  echo "::error::could not query $repo — ACCESS failure, not a missing image"; exit 1
fi
if ! grep -qx "$IMAGE_TAG" <<<"$TAGS"; then
  echo "::error::$repo:$IMAGE_TAG is genuinely absent"; exit 1
fi
```

`cmd | grep -q ... || fail` silently conflates the two, because a failed command and an empty
result look identical downstream of a pipe.

### The OIDC subject depends on the trigger — declare an environment on every job

`deploy-uat` failed with:

```
AADSTS700213: No matching federated identity record found for presented assertion
subject 'repo:veer-vrat/veervrat-app:environment:uat'
```

Two things to internalise, both non-obvious:

1. **A job that declares `environment: X` presents `environment:X` as its subject** — not the
   branch ref. Registering `ref:refs/heads/main` does nothing for such a job.
2. **A job with *no* environment presents a subject that changes with the trigger**:
   `ref:refs/heads/main` on a branch push, `ref:refs/tags/prod-2026-08-16` on a tag push. So a
   branch-ref credential silently works for UAT and fails every production run.

And **`subject` is exact match** — `refs/tags/*` is not a wildcard, it is a literal string
matching nothing. (Wildcards need Azure's flexible federated credentials with a claims
expression, a different feature.)

**The fix that makes this stop being fragile: declare a GitHub Environment on every CD job**,
including build. Then every subject is `environment:<name>`, identical across branch and tag
triggers, and there are exactly three credentials to register:

```
repo:<owner>/<repo>:environment:build
repo:<owner>/<repo>:environment:uat
repo:<owner>/<repo>:environment:prod
```

The `build` environment gates nothing; it exists purely to stabilise the subject.

AADSTS700213 always names the subject it presented — read that string and register it
verbatim rather than reasoning about what it ought to be.

### A flag that gates a resource DELETES it — "don't touch the apps" is not `count = 0`

The most damaging bug of the whole exercise, and it was in my own deploy action.

Step 1 applied `deploy_apps=false`, with the stated intent of "update infrastructure while
leaving the running apps alone". But `deploy_apps` gates `count` on the app resources, so
Terraform did the only thing it could: **destroyed the running apps**. It destroyed the
migration job with them — gated on the same flag — so the very next step failed with
`ResourceNotFound` on the job it had just deleted.

Against UAT this was an outage nobody saw. **Against prod it would have been a full outage on
every single deploy.**

Two corrections:

1. **Separate what the flag controls.** Jobs (migrate, seed) are gated on `image_tag != ""` —
   they must exist *before* apps deploy, so they cannot depend on the apps' flag.
2. **To leave apps alone, pin them — do not un-gate them.** A separate `app_image_tag`
   variable holds the apps on the image they are *currently serving* while migrations run:

   ```bash
   TAG=$(az containerapp show -n veervrat-$ENV-api -g veervrat-$ENV \
     --query "properties.template.containers[0].image" -o tsv | sed 's/.*://')
   terraform apply -var="image_tag=$NEW" -var="app_image_tag=$TAG" -var="deploy_apps=true"
   ```

   Jobs move to the new image; apps do not move at all. Then after migrations succeed, a
   second apply without `app_image_tag` rolls the apps forward — Container Apps starts the new
   revision and waits for its readiness probe before shifting traffic, so the old one serves
   throughout.

**The generalisable lesson:** in Terraform, "don't change X yet" and "X should not exist" are
the same expression if you reach for `count`. When you want a resource to persist unchanged,
pin its inputs — never gate its existence. Read a plan's *destroy* count as the primary
signal, not the add count.

### `terraform validate` does not check the `-var` flags you actually pass

CD failed with:

```
Error: Value for undeclared variable
```

`app_image_tag` had been added to `modules/environment` but not to the `envs/uat` wrapper
that CD invokes. Locally everything looked fine: `terraform validate` passed (it validates
configuration, not invocation) and a manual `apply` succeeded (because it did not pass the
new flag).

**Every variable CD passes must be declared in the env wrapper *and* forwarded to the
module** — the wrapper is a second place to update, and forgetting it fails only in CI.

Cheap check before pushing a pipeline change:

```bash
for v in image_tag app_image_tag deploy_apps migrate_command; do
  grep -q "variable \"$v\"" main.tf || echo "MISSING: $v"
done
```

The general shape: a thin pass-through layer is easy to forget precisely because it contains
no logic. When adding a module variable, grep for every wrapper that calls the module.

### Azure CLI hangs forever if IPv6 to Microsoft's login endpoint is broken

Every `az` command that touched Azure (even `az group list`) hung indefinitely — no error,
no timeout, nothing. `az account show` had worked moments earlier, which ruled out an
expired login.

Diagnosed with `az ... --debug`: the log showed a valid cached refresh token being used
(`Cache attempts an RT`), then hung opening a connection to
`login.microsoftonline.com`. Confirmed the actual cause directly:

```bash
curl -4 https://login.microsoftonline.com/   # 302 in 0.26s — fine
curl -6 https://login.microsoftonline.com/   # timeout, 10s   — hangs
```

IPv6 to Microsoft's login endpoint was broken on the network; Azure CLI's Python HTTP stack
has no "Happy Eyeballs" fallback, so it hung on the first (IPv6) address forever rather than
falling back to IPv4. `gh` and plain `curl` were unaffected because they/the OS resolver
behave differently.

**Fix:** `sudo networksetup -setv6off Wi-Fi` (macOS). Re-enable with
`sudo networksetup -setv6automatic Wi-Fi` once no longer needed. This is a
machine-network change, not a project one — confirm with whoever owns the machine before
running it, and reverse it afterward rather than leaving IPv6 off indefinitely.

**If `az` ever appears to hang with zero output, this is the first thing to check** — it
looks identical to a login prompt silently waiting on stdin, which is the misleading
diagnosis that costs the most time.

---

## 15. CD: what GitHub can and cannot do, and where it's authorized

### Identity and credentials

One user-assigned managed identity, `veervrat-github-actions` (in `veervrat-shared`,
`infra/terraform/envs/shared/github-oidc.tf`), shared by every CD job. No client secret, no
publish profile — GitHub exchanges a short-lived OIDC token for an Azure token at run time.

**Three federated credentials, one per GitHub Environment** (`build`, `uat`, `prod` — see §14
"declare an environment on every job" for why there are exactly these three, no more):

```
repo:veer-vrat/veervrat-app:environment:build
repo:veer-vrat/veervrat-app:environment:uat
repo:veer-vrat/veervrat-app:environment:prod
```

Verify what exists: `az identity federated-credential list --identity-name
veervrat-github-actions -g veervrat-shared -o table`.

### Roles — all at subscription scope, deliberately

| Role | Scope | Why |
|---|---|---|
| Contributor | subscription | CD creates resource groups itself (`veervrat-uat`, `veervrat-prod`), so anything narrower couldn't provision a new environment |
| AcrPush | `veervratacr` | push built images — no admin password exists on the registry (`admin_enabled = false`) |
| Storage Blob Data Contributor | `veervrattfstate` | read/write Terraform state |
| Key Vault Secrets Officer | subscription | re-apply the same generated secrets on every run — Terraform is idempotent, so this must be read/write, not just read |

**Contributor cannot grant roles.** CD can deploy infrastructure but cannot widen anyone's
access, including its own — the same escalation boundary Azure enforces everywhere else in
this project.

Because every grant is subscription-scoped rather than resource-group-scoped, **prod needed
zero additional role assignments** once its resource group existed — confirmed via
`az role assignment list --assignee <client-id> --scope /subscriptions/<id>` before the
first prod deploy, rather than assumed.

### No paid-plan reviewer gate — the tag is the gate

GitHub's required-reviewers protection rule needs a paid plan on private repos (422 on this
account — see §14). The `prod` GitHub Environment therefore carries no protection rule; it
exists solely to make the OIDC subject `environment:prod`. The deploy gate is **cutting and
pushing a `prod-YYYY-MM-DD` tag** — deliberate and traceable, accepted as adequate for a
single maintainer. Revisit with a second maintainer or a move to an org.

## 16. A doc-only merge used to rebuild and redeploy anyway (2026-08-16)

`cd.yml`'s trigger was `push: branches: [main]`, with no path filter — every merge to `main`
rebuilt all 3 images and redeployed UAT, including merges that touched only
`documentation/`, `ops/`, or a `.md` file. Caught after a pure doc-reorganisation PR (#59)
triggered a full CD run for nothing.

**Why not fix it by making UAT tag-based too, matching prod?** Considered and rejected. UAT's
entire value is running the exact commit that just merged, immediately — that's what lets an
integration bug get attributed to one merge instead of a batch, and it's the whole reason a
continuous-deploy staging environment exists at all. Prod is tag-gated because it protects
real users and the tag is a deliberate go/no-go act; UAT protects nobody, so gating it the
same way would trade away the fast-feedback property for a manual step with no matching
safety benefit. It would also erase the one thing that currently makes UAT and prod
*behave* differently — trigger discipline (auto vs. deliberate tag) — collapsing them into
two environments that differ only in size.

**The actual fix: filter the trigger, not the environment model.** `prepare` now diffs
`github.event.before` against the pushed SHA and sets `app_changed=false` when every changed
path matches an ignore list (`documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/`, any
`*.md`). `build` skips when a **branch push** to main found `app_changed=false`; `deploy-uat`
skips automatically when `build` skips (needs it). **Tag pushes are never filtered** — the
`build` job's condition is `startsWith(github.ref, 'refs/tags/prod-') || app_changed !=
'false'`, so a `prod-*` tag always builds regardless of what changed. Filtering a rare,
already-deliberate act would only add a way for a real prod deploy to silently no-op.

The ignore list is an allow-list of known-safe non-app paths, not a blocklist of app paths —
an unrecognised new top-level directory defaults to *triggering* a build, not skipping one.

**A portability trap hit while writing the check:** the first version used `grep -qvE
'pattern'` to test "did any changed file NOT match the ignore list". `-q` makes grep exit as
soon as it has enough input to decide, and piped from a `$(...)` command substitution this
returned the wrong exit status on this runner intermittently — a known class of `grep -q`
flakiness on piped input, not specific to one grep implementation. Fixed by capturing the
filtered output into a variable first (`non_ignored="$(... | grep -vE ... || true)"`) and
checking `[ -n "$non_ignored" ]` instead of trusting grep's own exit code. Lesson: don't
trust `grep -q`'s exit status when the input comes from a pipe rather than a file — capture
and test the output instead.

## 17. Prod's frontend was silently talking to UAT's backend (2026-08-17)

**The single most serious defect found in this project so far.** Prod was deployed, `/ready`
was green, TLS was valid, the custom domain resolved — and every request a prod user made
would have read and written **UAT's database**.

### How it was found

Not by a health check. While verifying prod's Google OAuth config, the `/api/v1/auth/google`
redirect returned a `redirect_uri` pointing at UAT's hostname — issued through **prod's**
domain. Reproduced 3/3. Hitting each api directly (`api.veervrat…` vs `api.uat.veervrat…`)
returned the correct per-environment value, which isolated the fault to the **web** tier.

### Root cause

`apps/web/next.config.ts` read `process.env.API_ORIGIN` at **module scope** and used it to
build the `rewrites()` destination. Next.js evaluates `rewrites()` at **build time** and bakes
the resolved destination into `routes-manifest.json`. The runtime environment variable is then
**never consulted** — Terraform was correctly setting `API_ORIGIN` on prod's web app, and it
was silently ignored.

CD builds the web image once with UAT's `API_ORIGIN`, then promotes that identical image to
prod (correctly, per "promote, never rebuild"). The result: prod's web tier proxied `/api/v1/*`
to UAT's api.

### Why nothing caught it

- `/ready` on both tiers was genuinely green — each *service* was healthy. Nothing asserted
  **which** api the web tier actually talks to.
- The runtime env var existed and had the right value, so any inspection of configuration
  (Terraform, `az containerapp show`) showed a correct system.
- Prod had zero users, so no one hit the wrong data.

**The guard this produces:** a deploy is not verified until you have confirmed, *from the
outside*, that each tier talks to its own environment's peers. Config that looks right is not
evidence. See the post-deploy check added to `DEPLOYMENT.md`.

### The general rule this is an instance of

> **Anything resolved at build time cannot vary per environment under "promote, never rebuild".**

Next.js bakes two categories at build:
1. `next.config.ts` evaluation — `rewrites()`, `redirects()`, `headers()` destinations.
2. Every `NEXT_PUBLIC_*` variable, inlined into the client bundle.

Both are frozen into the image. A per-environment value in either is a latent bug, not a
configuration choice. Known instances at time of writing:

| Baked value | Symptom on prod |
|---|---|
| `API_ORIGIN` (via `rewrites()`) | **prod web → UAT api** — this defect |
| `NEXT_PUBLIC_SITE_URL` | `og:url`/`og:image` point at UAT — every link preview wrong |
| `NEXT_PUBLIC_FEEDBACK_MODE` | cannot differ between UAT and prod (drove B1) |
| `NEXT_PUBLIC_CONTENT_EDIT` | same |

`NEXT_PUBLIC_COMMIT_SHA` is *correctly* baked — it describes the image, not the environment.
That is the test: **does this value describe the image, or where the image is running?** Only
the former may be baked.

### The fix

Environment-varying values must be resolved at **request time**, not build time. The web tier
is a running Next.js server and can read `process.env` server-side per request, so the correct
shape is to deliver configuration from server to client at runtime rather than inlining it.

Combined with the api now having its own hostname (`api.veervrat.jnanaprabodhini.org`), this
also removes the `/api/v1` rewrite proxy entirely — which is independently required for
WebSocket chat (Next rewrites do not forward WS upgrades, see O8) and lets session cookies
drop the `SameSite=None` workaround, since web and api now share a registrable domain.

Tracked as an OpenSpec change; see `ops/PROJECT-STATUS.md`.

### Outcome (2026-08-17)

Fixed by `openspec/changes/runtime-environment-config`: per-environment values are read at
request time, the `/api/v1` rewrite proxy is gone, cookies are `SameSite=Lax`, and CD now
asserts cross-tier wiring. Deployed to UAT and confirmed there — the web tier advertises its own
api, `og:url` names the right environment, the OAuth `redirect_uri` sits on the api origin, CORS
returns the web origin with credentials, and cookies come back `Secure; SameSite=Lax` host-scoped.

Two lessons the fix itself produced:

**A verification written against the architecture you are replacing will fail on its first
run.** The new wiring check probed `/api/v1/auth/google` on the *web* origin — the proxy path
that the same change deletes. It 404'd, so the check reported "could not reach the web tier" on
a deploy that had actually succeeded. Harmless here, but the failure mode is worse than it
looks: a check that fails for the wrong reason teaches people to distrust and then bypass it.
It now probes the **served HTML**, which carries the runtime config the browser will really
use — a stronger assertion than reading back a value we ourselves set.

**Assert positively, and beware nested hostnames.** The first draft asked "does the *other*
environment's host appear?" That is unreliable when hostnames nest:
`api.uat.veervrat.jnanaprabodhini.org` contains `veervrat.jnanaprabodhini.org`, so
"prod must be absent" flags a perfectly healthy UAT. Asserting the exact expected host is
unambiguous in both directions. Also note the `Location` header is percent-encoded — `//`
arrives as `%2F%2F`, so never match on it.

## 18. A freshly provisioned environment has no way to log in (2026-08-17)

Found while trying to browser-verify §17's fix on UAT. Worth stating explicitly, because it is
invisible until someone tries to sign in and it blocks verification of anything auth-related:

- The seed loads **content only** — virtues, weaknesses, sentences, exposures, resolutions,
  challenges. It creates **zero users** (no `prisma.user` writes in `src/database/seed.ts`).
- Google OAuth carries the `placeholder-not-configured` Terraform default in **both** UAT and
  prod, so the OAuth path fails before it reaches Google.
- Credential login refuses any account whose email is unverified
  (`auth.service.ts` → `EmailNotVerifiedException`), and email delivery is not wired (B14).

So a new environment reaches "green `/ready`, correct wiring, fully seeded" while remaining
**impossible to log into**. Health checks cannot see this: every service is genuinely healthy.

**Consequence for sequencing:** any change to cookies, CORS, CSRF or sessions can only be
verified by a real browser session, so wiring email (B14) or real OAuth credentials (O23) is a
*prerequisite* for validating auth work — not a follow-up to it. Add this to the zero-to-running
sequence in `../DEPLOYMENT.md`: an environment is not "done" until someone can log in.

## 19. GitHub Actions instability — 2026-08-17

**Symptom, roughly 14:50–16:00 IST on 2026-08-17:** the Actions API and runners degraded in
several distinct ways within the hour —

- `503 No server is currently available` from `api.github.com/graphql` on `gh pr merge` /
  `gh pr checks`
- `429 Too Many Requests` while a runner downloaded `pnpm/action-setup`, failing a job during
  **Set up job**, before any of our code ran
- `404 Not Found` on `/actions/runs` and `/actions/runs/<id>/jobs` for a repo that was
  otherwise readable, with valid auth — so run status could not be read at all for a while

**How to recognise it as theirs, not ours:** the 429 failure happened in *Set up job*, while
downloading a third-party action — nothing to do with the code in the commit. The 404s were on
Actions endpoints only; `/repos/<owner>/<repo>` answered normally with the same token. When a
failure is upstream of your own build steps, or an API contradicts itself between endpoints,
suspect the platform before debugging your change.

**Confirmed as a real GitHub incident** (checked 2026-08-17): a widespread outage with error
rates around 20% on both web and API traffic, roughly half of archive/raw-content downloads
failing, and GitHub Actions degraded. So the diagnosis above was right for the right reason —
worth noting that "retry a few times" was the correct response to a genuine 1-in-5 failure rate,
not superstition.

**What worked:** simply retrying. Failed jobs were re-run several times each; the build
eventually passed, then `deploy-uat` failed and was re-run until it passed too. No code change
was involved.

**Guidance:** re-run failed jobs a few times before diagnosing. Do **not** reach for the manual
`az acr build` fallback (`../DEPLOYMENT.md` §2) just to route around a platform blip — it ships
an image that CI never gated, and it hides whether the failure was actually ours. Reserve it
for a genuine, prolonged outage, and say explicitly that you are deviating.
