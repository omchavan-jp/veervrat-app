# Azure / Microsoft Account — Source of Truth

Operational reference for Jnana Prabodhini's Microsoft tenant and the Veervrat Azure setup.
**This is the base truth.** If something here disagrees with memory, this file wins — and if
reality diverges from this file, update the file in the same session.

Last verified: **2026-08-18**

> Sensitive-ish but not secret: tenant/subscription IDs are identifiers, not credentials. No
> passwords, keys, or card numbers belong in this file — ever.

---

## 1. Organisation

| Field | Value |
|---|---|
| Legal name | **Jnana Prabodhini** |
| Address | 510, Sadashiv Peth, Pune, MH 411030, India |
| Phone | 02024207000 |
| Website | https://www.jnanaprabodhini.org/ |
| Society registration | Bom/418/Poona/63 (Societies Registration Act, 1860) |
| Public trust registration | F-254 (Pune) (Maharashtra Public Trusts Act, 1950) |
| PAN | AAATJ1195M |
| Tax status | 12A + 80G (80G ref. AAATJ1195MF20214); FCRA; CSR-1 (CSR00002565) |

---

## 2. Microsoft tenant

| Field | Value |
|---|---|
| Tenant name | Jnana Prabodhini |
| Tenant ID | `5273b83c-0127-473f-bc58-a6f0d3c75ab1` |
| Primary domain | `jppune.onmicrosoft.com` |
| Country / data location | India / **Asia datacenters** |
| Security defaults | **ON** (enforces MFA for all users) |
| M365 in use? | **No** — JP runs **Google Workspace** for mail/files. Tenant is Azure-only. |

---

## 3. Nonprofit programme

| Field | Value |
|---|---|
| Status | **Approved** |
| Effective date | **12 September 2025** (~11 months before the grant was claimed — eligibility and grant run on separate clocks) |
| Registered domain | `jppune.onmicrosoft.com` |
| Registration type | ITPAN · legal identifier `AAATJ1195M` |
| Primary contact | Devavrat Munagekar — `devavrat.munagekar@jnanaprabodhini.org` |
| Portal | `nonprofit.microsoft.com` (requires **Global Admin**) |

Profile also holds: org name, address (510 Sadashiv Peth, Pune, MH 411030, IN), website, phone
02024207000. ⚠️ **Do not edit name / legal identifier / city / country — triggers re-validation
of eligibility** (see guardrails).

### Azure grant — verified on the Azure Credits blade
| Field | Value |
|---|---|
| Source | **Azure non-profit sponsorship credit** |
| Amount | **US$2,000.00 = ₹1,91,300.00** |
| Effective | **14/08/2026** |
| **Expires** | **14/08/2027** — ⚠️ does **not** roll over |
| Used | ₹0.00 (0%) |
| Status | Active |
| Activated by | Devavrat, 2026-08-14 — created the subscription below |

*Local-currency balance is an estimate — Microsoft recalculates it monthly from Thomson Reuters
benchmark rates, so the ₹ figure drifts while the US$2,000 stays fixed.*

*The Credit transactions table shows two "New credit added US$2,000.00" rows, but the running
balance stays US$2,000.00 — a display artefact, not a double grant.*

📅 **Google Calendar reminder created** — 1 July 2027, all-day, on `om.chavan501@gmail.com`
(email reminder 1 day prior, popup 7 days prior).

---

## 4. Azure subscription

| Field | Value |
|---|---|
| Name | **`veervrat`** ✅ (was "Azure subscription 1"; renames take ~10 min to propagate) |
| Subscription ID | `3ffcc513-dca6-453c-b9ff-83b096ea1381` |
| Type | Usage based · **Microsoft Azure Plan (MCA)** — *not* legacy Sponsorship |
| Purchased | 2026-08-14 · Billing frequency **Monthly** · Next invoice 2026-09-09 |
| Currency | **INR** (~₹95.65/USD per the credit conversion) |
| Status | Active · **UAT and prod both running** — UAT live 2026-08-16, prod live 2026-08-16 and correctly wired since `prod-2026-08-17` |
| Parent management group | Tenant Root Group |
| Target region | **Central India (Pune)** |

### Billing account / profile — both renamed to "Jnana Prabodhini" ✅

| Field | Value |
|---|---|
| Billing account ID | `02c7cc3f-d29f-5212-6290-e1fe4979a844:34d2be04-4138-43a2-baec-656226e16130_2019-05-31` |
| Billing profile ID | **`HMHP-IOEN-BG7-PGB`** |
| Agreement type | **Microsoft Customer Agreement** (self-service) |
| Sold-to / Bill-to | Devavrat Munagekar, Jnana Prabodhini, 510 Sadashiv Peth, Pune MH 411030 IN |
| Tax ID / Registration no. | **None provided** — JP may want its PAN/GSTIN on invoices; ask finance |

Both were auto-named **"Devavrat Munagekar"** (Azure names them after whoever clicks Activate).
Renamed 2026-08-15 — the profile name prints on monthly invoices.

⚠️ **Billing email is unverified.** The Properties blade warns *"Email verification required"* and
the sold-to address shows `devavrat.munagekar@jnanaprabodhini.org` **Not verified**. Until Devavrat
verifies it, **important billing notifications may not be delivered**. Chase this.

### ⚠️ Payment method — and why there is no hard spending cap
**MasterCard ••••2000 — belongs to Ashutosh Barmukh**, current *sahakaryavah* of Jnana Prabodhini.

**MCA subscriptions do not support a spending limit.** That feature exists only on legacy offers
(Free Trial, old Pay-As-You-Go, Sponsorship). So when the grant is exhausted or expires on
2027-08-14, usage **silently bills Ashutosh's card** — there is no toggle that suspends instead.

Mitigations, in order of preference:
1. **Budget → action group → automation** that stops resources at 100%. The genuine hard stop;
   add **before public launch**, not needed while the footprint is near zero.
2. **Swap the personal card for a JP institutional one** — doesn't change mechanics, but moves
   the exposure from an individual to the organisation. Worth raising with Ashutosh.
3. Removing the payment method is *not* advised — MCA generally requires one, and its absence can
   suspend the account for non-payment.

Current control: budget ₹13,000/mo with alerts at 50/75/100% to five recipients. Proportionate
while forecast (~₹5,600/mo) sits far below runway (~₹15,900/mo); the real risk it guards against
is a misconfiguration spike, not gradual drift.

---

## 5. Deployed resources

**Terraform is now live** — `veervrat-app/infra/terraform/` (Phase 1, landed 2026-08-16;
Phase 2A — UAT stateful core — landed 2026-08-16). State backend: storage account
`veervrattfstate` in `veervrat-shared` (hand-created once via
`infra/terraform/bootstrap/create-state-backend.sh`, container `tfstate`, Azure AD auth — no
storage key), one state file per environment (`shared.tfstate`, `uat.tfstate`, later
`prod.tfstate`). `terraform plan` in both `envs/shared` and `envs/uat` shows **no changes** —
state matches reality.

### Resource groups

| Name | Region | Tags | Holds |
|---|---|---|---|
| `veervrat-shared` | Central India | `project=veervrat`, `environment=shared` | DNS zone (imported), ACR, tfstate storage account |
| `veervrat-uat` | Central India | `project=veervrat`, `environment=uat` | Key Vault, Postgres, Redis, Container Apps env + **api/web apps + migration job**, identities, alerting |
| `veervrat-prod` | Central India | `project=veervrat`, `environment=prod` | mirrors `veervrat-uat` — Key Vault, Postgres (35-day backups), Redis, Container Apps env + api/web + jobs, identities, alerting |

Environments are split by **resource group**, not by subscription (D12). Shared,
cross-environment resources live in `veervrat-shared`.

### Container Registry — `veervratacr`

Basic tier (~$5/mo), `admin_enabled=false` — **no admin password exists**; apps pull via
user-assigned managed identity with AcrPull. Created by Terraform 2026-08-16. Contents
listed under the UAT section below.

### Per-environment Key Vaults — `veervrat-uat-kv` and `veervrat-prod-kv`

**Not shared across environments** — a Phase 1 mistake, caught and corrected same-day: the
original `veervrat-kv` in `veervrat-shared` was deleted (confirmed 0 secrets) once it became
clear every real secret is per-environment by nature, and a shared vault would let a
compromised UAT app read the production database password. Standard tier, RBAC authorization,
90-day soft-delete (set at creation — this value is immutable after creation). Om has **Key
Vault Administrator**. Holds `database-url` and `redis-url` — generated by Terraform, never
typed by a human, never committed anywhere.

### UAT environment — `veervrat-uat` (2026-08-16) — **app is LIVE**

First successful Azure deploy 2026-08-16. `/ready` returns `database: up, redis: up`.

**URLs** (auto-generated; replaced by the custom domain at DNS cutover):
- web — `https://veervrat-uat-web.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io`
- api — `https://veervrat-uat-api.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io`
- Container Apps Environment default domain — `proudcoast-d3aa08a0.centralindia.azurecontainerapps.io`.
  App URLs are `https://<app-name>.<default-domain>`, i.e. **predictable before the apps exist**,
  which is useful for writing Terraform.
  ⚠️ **It is NOT a reason to bake URLs into the web image.** This paragraph used to say the
  predictability "lets the web image be built knowing the api's URL, since `NEXT_PUBLIC_*` is
  baked in at build time". That reasoning caused **O22**: one image is promoted from UAT to prod
  without rebuilding, so a baked URL carried UAT's value into production and prod's web tier
  addressed **UAT's database** for a day. Per-environment URLs are runtime config now
  (`apps/web/lib/runtime-config.ts`); see conventions §17.

| Resource | Name | Notes |
|---|---|---|
| Postgres | `veervrat-uat-psql` | Flexible Server, Burstable `Standard_B1ms`, **v18** (matches the Neon source data — no version conversion at migration), 32GB, **auto-grow ON**, 7-day backups, zone 2 pinned, `lifecycle.prevent_destroy` |
| ⤷ extensions | `azure.extensions = PG_TRGM` | ⚠️ Azure gates `CREATE EXTENSION` behind a **server-level allow-list** — being DB admin is not enough. Keep in sync with `grep -rhoiE "CREATE EXTENSION[^;]*" apps/api/prisma/migrations/` |
| Redis | `veervrat-uat-redis` | **Azure Managed Redis** `Balanced_B0`, TLS-only, eviction `AllKeysLRU`, no HA (beta tradeoff) |
| Key Vault | `veervrat-uat-kv` | RBAC auth, 90-day soft-delete. Secrets: `database-url`, `redis-url`, `postgres-admin-password`, `session-secret` — all Terraform-generated, never typed by a human |
| Container Apps env | `veervrat-uat-cae` | + Log Analytics `veervrat-uat-logs` (30-day retention) |
| api | `veervrat-uat-api` | scale-to-zero → 2 replicas, `DATABASE_POOL_MAX=5`, liveness `/health`, readiness `/ready` |
| web | `veervrat-uat-web` | scale-to-zero → 2 replicas |
| Migration job | `veervrat-uat-migrate` | manual trigger only, `replica_retry_limit=0`, runs the **build**-stage image |
| Seed job | `veervrat-uat-seed` | manual trigger only; reference content, idempotent upserts |
| Grant-admin job | `veervrat-uat-grant-admin` | manual trigger only. ⚠️ **Can mint an administrator** — targets `bootstrap_admin_email`, empty by default. Refuses unverified addresses unless deliberately overridden. Kept on purpose: it is the only way back in if admin access is lost. See conventions §22 |
| Identities | `veervrat-uat-api-id`, `veervrat-uat-web-id` | user-assigned; AcrPull on the registry, api additionally Key Vault Secrets User. **No registry password or connection string anywhere** |
| Alerting | `veervrat-uat-ops` + `veervrat-uat-psql-storage` | storage > 80%, hourly → `om.chavan@jnanaprabodhini.org` |

### Prod environment — `veervrat-prod` (2026-08-16) — **app is LIVE**

Mirrors UAT via the same Terraform module; only the parameters differ. Documented separately
because "the same module" is not the same as "the same state", and prod's differences are the
ones that matter under pressure.

**URLs** — `https://veervrat.jnanaprabodhini.org` (web), `https://api.veervrat.jnanaprabodhini.org`
(api). Custom domains bound 2026-08-17 with Azure-managed DigiCert certs.

| Resource | Name | Notes |
|---|---|---|
| Postgres | `veervrat-prod-psql` | same SKU as UAT, **35-day backups** (the Flexible Server maximum; set at creation because it is immutable afterwards — UAT's 7 days is fine for disposable content) |
| Redis | `veervrat-prod-redis` | Azure Managed Redis `Balanced_B0`, TLS-only |
| Key Vault | `veervrat-prod-kv` | RBAC auth, 90-day soft-delete. Also holds `smtp-password` and `google-client-secret`, both set **out of band** — Terraform creates them with placeholders |
| Container Apps env | `veervrat-prod-cae` | + Log Analytics `veervrat-prod-logs` |
| api | `veervrat-prod-api` | **scale-to-zero** → 2 replicas, `DATABASE_POOL_MAX=5`. ⚠️ Deliberate: costs nothing idle, but the first request after idle is a **5–20s cold start** (#92). Revisit `min_replicas = 1` (~$14/mo) before beta testers arrive |
| web | `veervrat-prod-web` | scale-to-zero → 2 replicas |
| Migration job | `veervrat-prod-migrate` | manual trigger, `replica_retry_limit=0`. ⚠️ Reported success without migrating anything until 2026-08-21 — see the traps table and conventions §21 |
| Seed job | `veervrat-prod-seed` | reference content, idempotent upserts. First run 2026-08-21: 6 virtues, 33 subvirtues, 35 weaknesses, 226 sentences, 128 resolutions, 82 exposures, 31 challenges |
| Grant-admin job | `veervrat-prod-grant-admin` | manual trigger. ⚠️ **Can mint an administrator** — targets `bootstrap_admin_email`, empty by default. Refuses unverified addresses unless deliberately overridden. Kept on purpose: the only way back in if admin access is lost. Conventions §22 |
| Identities | `veervrat-prod-api-id`, `veervrat-prod-web-id` | user-assigned; same grants as UAT |
| Alerting | `veervrat-prod-ops` + `veervrat-prod-psql-storage` | storage > 80% |

**Differences from UAT that have bitten or could:**

| | UAT | Prod |
|---|---|---|
| `feedback_mode` | `test` — widget on for everyone (Nachiket reviews here) | `off` until #40 lands per-user grants |
| Postgres backups | 7 days | 35 days — **immutable after creation** |
| Google OAuth client | its own client + secret | its own client + secret; callback on the **api** origin |
| `COOKIE_DOMAIN` | `uat.veervrat.jnanaprabodhini.org` | `veervrat.jnanaprabodhini.org` — ⚠️ absent until 2026-08-21; without it login succeeds and does not survive a refresh, which reads as a session bug rather than a cookie-scope one |

⚠️ **Prod's database held no tables from 2026-08-16 to 2026-08-21.** Not a missing migration —
no schema at all, while `/health` and `/ready` both returned 200. See the traps table.

### Container registry contents (`veervratacr`)

| Repository | Purpose |
|---|---|
| `veervrat-api` | the api runtime image |
| `veervrat-api-migrate` | **build**-stage image — carries the `prisma` CLI, which is pruned out of the runtime image. Only this one can apply migrations. |
| `veervrat-web` | Next.js standalone server |

All three tagged with the release git SHA (currently `6ead179`) plus `latest`.
⚠️ **No purge policy.** Automatic retention is **Premium-tier only**; on Basic the path is a
scheduled `acr purge` task. Nothing to purge yet, but this is the line item that grows
unattended once CD pushes an image per merge. Basic includes 10 GB.

⚠️ **Azure retired "Azure Cache for Redis" mid-build (2026-08-16).** That service and SKU no
longer accept new deployments; the `apply` failed outright. Replaced with **Azure Managed
Redis** (`azurerm_managed_redis`, not `azurerm_redis_cache`). Its own stated replacement
resource in the provider, `azurerm_redis_enterprise_cluster`, is *also* deprecated and
rejects the new SKU names — don't be misled by it. Priced via Azure's live retail API
(`prices.azure.com`), not the marketing page, which renders `$-` placeholders.

Both Postgres and Redis: public network access enabled with a firewall/identity boundary
(no VNet yet — per D15, deferred to pre-launch; Consumption-plan Container Apps have no
static outbound IP without VNet integration anyway, so per-IP rules aren't workable yet).

### ⚠️ Traps hit on the first deploy — read before deploying anything new

Each of these cost real time and would recur. Full detail in
`veervrat-app/documentation/21_Infrastructure-Conventions.md` §14.

| Trap | What happens | Guard |
|---|---|---|
| **Docker context includes `infra/`** | `.terraform/` holds ~220MB of provider plugins *per env dir*; context was 139MB and builds appeared to **hang**, not fail | `.dockerignore` excludes `infra`; verify with `ls -la` on the printed `build_archive_*.tar.gz` — should be <1MB |
| **Building images locally** | Dev machines are arm64, Container Apps is amd64 — the image fails to start with an error resembling corruption | always `az acr build` (builds *in* Azure) |
| **Images tagged from different commits** | no single tag to deploy or promote; breaks "promote don't rebuild" | one checkout → one SHA → all images. `az acr build` uploads the *working tree*, so the SHA in a tag is a label you choose, not something enforced |
| **`terraform apply` before the image exists** | api revision fails `MANIFEST_UNKNOWN`; the app is created in `Failed` state but never enters Terraform state, so the **retry is then blocked** by "resource already exists" | wait on the *tag*, not the build task: `until az acr repository show-tags ... \| grep -q "$SHA"; do sleep 20; done` |
| **Orphaned `Failed` Container App** | blocks re-apply | check `provisioningState`/`latestRevisionName`/`fqdn` first: no FQDN + no revisions ⇒ safe to `az containerapp delete`; otherwise `terraform import` — never delete an app with live revisions |
| **Postgres extension not allow-listed** | migration fails *after* earlier ones applied, leaving a half-migrated DB | `azure.extensions` server config, kept in sync with the migrations |
| **A failed Prisma migration blocks all later ones** | `P3018`; every later `migrate deploy` refuses | deliberate override: `-var='migrate_command=migrate resolve --rolled-back <name>'`, then re-run normally. Never an automatic retry — hence `replica_retry_limit=0` |
| **`NEXT_PUBLIC_*` build args silently dropped** | no warning; the value never arrives and a stale fallback ships | the Dockerfile must declare **both** `ARG` and `ENV`; never default a public URL to a real deployed host |
| **`job start --image` silently replaces the container** | drops `command`, `args` and `env`; the job runs the image's default entrypoint, does nothing, exits 0, and is recorded **Succeeded**. Prod ran three "successful" migrations against a database with no tables | never override a job execution — change what it runs through Terraform. Conventions §21 |
| **An overridden job execution produces no logs** | zero rows in Log Analytics under any container name, so nothing contradicts the false success | same guard — no overrides. Verified on prod 2026-08-21 |
| **`/health` stays green on a schema-less database** | it is cheap by design so it will not flap on a DB blip; `/ready` pings Postgres, which was genuinely reachable. Nothing probes the **schema** | do not read a green health check as "the app works". Exercise a real write path after a deploy |
| **Job logs are not where app logs are** | `ContainerAppName_s` is **empty** for jobs; filtering as you would for an app returns nothing and reads as "jobs do not log" | filter on `ContainerName_s`; allow ~2 min for ingestion. `az containerapp job logs show` misses finished jobs — the replica is reaped in seconds |
| **A killed `terraform apply` leaves an orphaned blob lease** | the next run fails with `state blob is already locked` and — confusingly — `blob metadata "terraformlockid" was empty`, so `force-unlock` has no ID to take. The state write itself usually **did** complete | check no apply is really running (`pgrep -fl terraform` — `terraform-ls` is just the editor), confirm the blob's `lastModified`, then `az storage blob lease break --account-name veervrattfstate --container-name tfstate --blob-name <env>.tfstate --auth-mode login`. Verify with a `plan` expecting `No changes` |
| **Secrets are in Terraform state in plaintext** | anyone who can read state has every secret for that environment | state lives behind Azure AD RBAC on `veervrattfstate`; treat read access as equivalent to Key Vault admin |


### CD — GitHub → Azure (2026-08-16)

One user-assigned identity, `veervrat-github-actions`, shared by every CD job. No stored
secret — GitHub OIDC exchanges a short-lived token at run time. Three federated credentials,
one per GitHub Environment (`build`, `uat`, `prod`) — see
`veervrat-app/documentation/21_Infrastructure-Conventions.md` §14–15 for why exactly three,
no wildcards.

Roles, all subscription-scoped: Contributor (it creates resource groups itself), AcrPush,
Storage Blob Data Contributor on `veervrattfstate`, Key Vault Secrets Officer. **Cannot grant
roles** — CD can deploy infrastructure but cannot widen anyone's access, including its own.

No paid-plan reviewer gate exists (422 on this account). The prod gate is the `prod-*` tag
itself; the `prod` GitHub Environment carries no protection rule.

⚠️ **If Azure CLI hangs with zero output/error, check IPv6 before anything else** — it looks
identical to a stuck login prompt. `curl -6 https://login.microsoftonline.com/` timing out
while `curl -4` succeeds is the signature. Fix: `sudo networksetup -setv6off Wi-Fi` (machine
change, not project — confirm with the machine owner, reverse with
`sudo networksetup -setv6automatic Wi-Fi` once done).

### DNS zone — `veervrat.jnanaprabodhini.org`

Created 2026-08-15 in `veervrat-shared`. Location **Global** (Azure DNS is not regional — the
resource group's region is metadata only). Tags: `project=veervrat`, `environment=shared`,
`managed-by=manual-bootstrap`. ~$0.50/mo, grant-covered. **Imported into Terraform state
2026-08-16** (`terraform import`, zero changes) — still hand-created in origin, now tracked.

**Nameservers** — these are what JP must publish as NS records on `jnanaprabodhini.org`:

```
ns1-04.azure-dns.com.
ns2-04.azure-dns.net.
ns3-04.azure-dns.org.
ns4-04.azure-dns.info.
```

> ⚠️ **Never delete and re-create this zone.** Azure assigns nameservers per zone; a new zone
> gets *different* values, which would mean asking JP's DNS operator to change the delegation
> all over again — a slow, third-party round-trip. Import it into Terraform
> (`azurerm_dns_zone`) rather than letting Terraform create it. This is why it carries
> `managed-by=manual-bootstrap`.

Zone starts with 2 record sets (the automatic NS and SOA records). All app records —
`veervrat`, `api`, `uat`, `api.uat`, cert validation, SPF/DKIM/DMARC — will be created by
Terraform *inside* this zone.

**Delegation status:** ⏳ requested from JP (Om → Rahul → Shantanoo, 2026-08-15). Verify with
`dig NS veervrat.jnanaprabodhini.org` once done.

---

## 6. Access — three independent systems

Azure permissions come from three separate systems. **None inherits from another.** This caused
real confusion during setup; remember it.

| System | Controls | Where assigned |
|---|---|---|
| **Entra directory roles** | identity, tenant settings, nonprofit portal | Entra ID → Roles and administrators |
| **Azure RBAC** | resources — deploy/configure/delete | Subscription → Access control (IAM) |
| **MCA billing roles** | credits, invoices, payment methods | Cost Management + Billing → billing account → IAM |

Global Admin grants **neither** RBAC nor billing. RBAC has an "Elevate access" bridge from
Global Admin; **billing has no back door at all**.

### Om's complete access inventory (as of 2026-08-15)

| # | Access | Scope | Granted by / when |
|---|---|---|---|
| 1 | **Global Administrator** | Entra ID, tenant `jppune.onmicrosoft.com` | Devavrat, 2026-08-15 |
| 2 | **Owner** (Azure RBAC) | subscription `veervrat` | Devavrat, 2026-08-15 |
| 3 | **Billing account owner** (MCA) | billing account *Jnana Prabodhini* | Devavrat, 2026-08-15 |
| 4 | **User Access Administrator** at root `/` | tenant-wide ("Elevate access" toggle) | pre-existing — ⚠️ **should now be turned OFF**, see below |
| 5 | `om.chavan@jppune.onmicrosoft.com` | Entra account **with M365 licence + Outlook mailbox** | JP IT, 2026-08-14 |
| 6 | `om.chavan@jnanaprabodhini.org` | **Google Workspace** account (JP daily mail) | JP IT, 2026-08-14 |
| 7 | Budget-alert + invoice recipient | billing profile | self, 2026-08-15 |

🧹 **Cleanup due:** #4 was the bootstrap that let access be granted before any RBAC existed.
Now that #2 is a direct role assignment, root-scope UAA is redundant privilege — switch it off at
**Entra ID → Properties → Access management for Azure resources → No**.

### Others

| Person | Account | Roles |
|---|---|---|
| **Devavrat Munagekar** | `admin@jppune.onmicrosoft.com`<br>`devavrat.munagekar@jnanaprabodhini.org` | Global Administrator · Billing account owner · nonprofit primary contact |

**Two global admins by design** — never drop to one (Microsoft's own guidance is 2–4).

**Nachiket Nitsure** (leads Veervrat) deliberately has **no Azure access** — non-technical.
Continuity is handled by this document, not a dormant account.

### Contacts and escalation

| Who | Role | For |
|---|---|---|
| **Rahul Dharmadhikari** | **JP IT lead** | ⭐ **primary technical contact — route requests through him** |
| Ashutosh Barmukh | *sahakaryavah*, JP | owns the card on file; institutional/identity decisions |
| Devavrat Munagekar | tenant admin | Azure billing, nonprofit programme, Entra |
| Shantanoo Mahajan | DNS operator | `jnanaprabodhini.org` DNS — met directly 2026-08-16, see below |
| Nachiket Nitsure | Veervrat product owner | product decisions |

📋 **Communication protocol (set 2026-08-15):** technical/infra requests go to **Rahul**, who
routes to Shantanoo or others as needed. ⚠️ **Superseded in practice 2026-08-16** — Om met
Shantanoo directly for the DNS/email handoff. Doc not yet reconciled with whether this is a
one-off or the protocol has genuinely relaxed — confirm before assuming direct contact is
now fine going forward.

### Notification recipients

**Budget alerts** (max 5) — `om.chavan@` · `devavrat.munagekar@` · `ashutosh.barmukh@` ·
`rahul.dharmadhikari@` (all `@jnanaprabodhini.org`) · `om.chavan501@gmail.com`

**Invoice by email** (up to 20; enabled on the billing profile) — the five above **plus**
`nachiket.nitsure@jnanaprabodhini.org`

### ⚠️ Two separate mail systems — always use `@jnanaprabodhini.org` for anything read by humans

`@jnanaprabodhini.org` = **Google Workspace** (daily mail, what everyone actually uses).
`@jppune.onmicrosoft.com` = **Microsoft tenant**. Some M365 licences *are* assigned, so these
mailboxes do exist and are reachable via Outlook — but **nobody monitors them day to day**.

→ For alerts, notifications and recipient lists, always use `@jnanaprabodhini.org`. An alert
landing in an unchecked mailbox is functionally lost.

---

## 7. 🚧 Guardrails — Global Admin is tenant-wide

Om holds Global Admin for Azure work. Everything below is **outside that remit** — coordinate
with Devavrat first, even though the permission technically allows it.

### ❌ Never without checking

1. **Nonprofit profile: organisation name, legal identifier, city, or country.** The portal
   states these **trigger re-validation of programme eligibility** — a fumbled edit could put
   the grant itself at risk. Treat that form as read-only.
2. **Security defaults** — disabling removes enforced MFA for every user.
3. **Conditional Access policies** — tenant-wide sign-in impact.
4. **Other users' accounts** — never modify or delete Devavrat's, and never remove his Global
   Admin.
5. **Domain settings** — do not add or verify `jnanaprabodhini.org` in Microsoft. It is live on
   **Google Workspace**; a domain verification here risks disrupting JP's real email.
6. **M365 licence purchase/assignment** — org-wide procurement, not this project's call.
7. **Deleting the tenant, subscription, or billing account.**
8. **Billing role assignments for other people**, and **payment method changes**.

### ✅ Safe — normal project work

- Anything inside the `veervrat` subscription: resource groups, resources, deployments
- Budget alerts and cost analysis
- Service principals / app registrations for CI/CD
- Registering resource providers
- Renaming the subscription, billing account, and billing profile *(agreed with Devavrat)*

**Rule of thumb:** if it affects only the Veervrat subscription, proceed. If it affects the
tenant, other users, the nonprofit registration, or money — message Devavrat first.

---

## 8. ✅ Decided — subdomain, not path

**Settled 2026-08-16 (O2): `veervrat.jnanaprabodhini.org`.** Live and serving since 2026-08-17,
along with `uat.`, `api.` and `api.uat.`. The analysis below is kept for the reasoning, not
because anything is still open.

Originally raised 2026-08-15: should Veervrat live at **`veervrat.jnanaprabodhini.org`**
(subdomain) or **`jnanaprabodhini.org/veervrat`** (path on the existing site)?

**Technical recommendation: subdomain.** Not a close call.

| | Subdomain | Path |
|---|---|---|
| Setup | one DNS record (or NS delegation) | **reverse proxy** on JP's existing web server |
| Dependency | none on JP's site | JP's site becomes a **hard dependency** — their outage = our outage |
| Code | no change | Next.js `basePath` change + asset/route rework |
| SSL | independent, auto-renewing | managed by JP's host |
| Cookies | isolated to the subdomain | **shared with the main JP site** — real security concern |
| Email | SPF/DKIM handled by JP IT on `notifications.jnanaprabodhini.org`, **zero risk to JP's Workspace mail** (D9 — we no longer own any mail records) | records must go on the **root domain** — risks JP's live mail |
| Debugging | direct | through someone else's proxy |

The email point alone is close to decisive: path-based hosting would force our mail records onto
the root domain that carries JP's Google Workspace mail.

**Who decides what:** the subdomain-vs-path choice is **technical → Rahul**. Whether Veervrat sits
under JP's identity at all (vs a standalone `veervrat.com`) is **institutional → Ashutosh/Nachiket**.

**Blocks:** ~~DNS setup, HTTPS certs~~ — both resolved 2026-08-17 (O1). Remaining: the WebSocket chat fix, which now needs the rewrite proxy removed rather than DNS. Email needs no domain work at all (D9).

---

## 9. Other providers (still live from the Railway era)

| Service | Purpose | Status |
|---|---|---|
| **Neon** | Postgres (us-east-1, PG 18.4) | live — ⚠️ **migration CANCELLED 2026-08-16 (D19)**; dump kept as an archive only. Decommission once nothing references it. |
| **Upstash** | Redis (us-east-1) | live |
| **Cloudflare R2** | object storage, bucket `veervrat-uploads-dev` | live, **empty** |
| **Google Cloud** | OAuth client (Google sign-in) | live — project `veervrat`, owned by the **jnanaprabodhini.org org**, see §9 |
| ~~**Resend**~~ | transactional email | **not used** — D9 (2026-08-17) moved email to JP IT's SMTP relay; no account was ever created |
| **Railway** | previous host | **removed** (trial expired) — app currently **down** |

Backup on disk: `backups/veervrat-neon-20260809T184831Z.dump` (2026-08-09, 50 tables).

⚠️ `veervrat-app/apps/api/.env.railway` holds live secrets in plaintext (GitHub PAT, Google
client secret, R2 keys, session secret). Never committed to git — **rotate at cutover**.

---

## 10. Open items

**Done ✅** — card owner identified (Ashutosh) · credit confirmed (₹1,91,300, 0% used) ·
all three renames · budget ₹13,000/mo with alerts at 50/75/100% · invoice-by-email enabled ·
calendar reminder for July 2027

**Also done ✅ (2026-08-16)** — 9 resource providers confirmed registered · Terraform Phase 1
(state backend, DNS zone imported, ACR created; shared Key Vault created then deleted same
day — see §5) · Terraform Phase 2A (`veervrat-uat`: per-env Key Vault, Postgres 18, Azure
Managed Redis, Container Apps Environment — see §5)

**Also done ✅ (2026-08-17 → 21)** — Terraform Phase 2B (`veervrat-prod`, see §5) · CD pipeline
live for both environments · custom domains + TLS on all four hostnames · email via JP's SMTP
relay, delivering · Google sign-in in both environments · **prod's schema created and seeded**
(2026-08-21, after five days with no tables — see the traps table) · migration job actually
verified rather than assumed (#112) · first administrator grantable (#114, conventions §22)

**Next**
- [ ] Small app change: swap `@aws-sdk/client-s3` for `@azure/storage-blob` in
      `apps/api/src/modules/uploads/uploads.service.ts` (currently speaks the S3 protocol,
      which Azure Blob does not) — blocks provisioning Blob Storage (O15)
- [ ] Update `infra-budget-log.md` target architecture: "Azure Cache Basic C0" → Azure Managed
      Redis `Balanced_B0` (the former no longer accepts new deployments — see §5)
- [ ] Revisit `api_min_replicas = 1` on prod before beta testers arrive — scale-to-zero means a
      5–20s cold start on the first request (#92), which is a poor first impression
- [ ] Turn **off** Elevate access (root-scope UAA) — redundant now (O13)
- [ ] Devavrat to **verify the billing email** (currently "Not verified" → notifications may not deliver)
- [ ] Consider adding JP's PAN/GSTIN to the billing account (Tax ID currently "None provided") — ask finance
- [ ] Rotate the secrets exposed during the Railway era (O12) — PAT, session secret, R2 keys
- [x] DNS via **Rahul** → Shantanoo: done 2026-08-16, per-record instead of NS delegation
      (met Shantanoo directly — see `ops/PROJECT-STATUS.md` O1/D14)
- [x] Decide subdomain vs path → subdomain, 2026-08-16 (§8)
- [x] ~~After Phase 2B: data migration~~ → cancelled (D19, fresh seed instead). Email is now JP's SMTP relay (D9); code shipped 2026-08-17

See `infra-budget-log.md` for the decision trail and budget analysis.


---

## 9. Google Cloud / Google sign-in

Set up 2026-08-17 (O23). Recorded in full because the console UI has already been renamed once
and the settings that matter are not discoverable from the app side.

| Field | Value |
|---|---|
| Project name / ID | `veervrat` |
| Organisation | **`jnanaprabodhini.org`** — institutional, not a personal Google account |
| Created and owned by | `veervrat@jnanaprabodhini.org` (shared JP mailbox) |
| Console area | **Google Auth Platform** (formerly "OAuth consent screen") |
| User type | **External** |
| Publishing status | **Testing** — capped at 100 test users for the app's lifetime |
| Scopes | `userinfo.email`, `userinfo.profile`, `openid` — all **non-sensitive** |

### Why each of those, in the terms that will matter later

**Org-owned, not personal.** Two earlier OAuth clients existed in personal projects
(`om-dev-463114`, `nifty-expanse-498201-b8`), both with only `localhost` redirects. Sign-in for
an institutional product should not depend on one person's Google account; the consent screen
also displays the publisher.

**External, despite being an institutional app.** *Internal* restricts sign-in to
`@jnanaprabodhini.org` accounts only — it describes *who may sign in*, not who owns the app.
Vratarthi are on personal Gmail, so Internal would lock out every real user. This is the single
easiest setting to get wrong here, and it fails at Google's end where it is hard to trace.

**Testing, not Published.** Publishing needs privacy-policy and terms URLs, and the app has
**neither page** (issue #81). While in Testing, only listed test users can sign in.

**No "unverified app" interstitial appears** — verified by real sign-in 2026-08-18. That warning
is tied to *sensitive or restricted* scopes; with only `email`, `profile` and `openid` Google
shows an ordinary consent screen. Testers see "Sign in to continue to jnanaprabodhini.org",
taken from the authorized domain. So Testing mode costs nothing in user experience here — the
only real limit is the 100-user cap.

⚠️ Publishing needs **no Google review**, because the scopes are non-sensitive. The two pages
are the entire blocker. Adding any further scope (Drive, Calendar, contacts) would pull the app
into a verification process taking weeks — so do not add scopes casually.

**Test users are Google accounts, not app accounts.** A Gmail plus-alias such as
`om.chavan501+uat@gmail.com` receives mail but is **not** a Google account and cannot be a test
user. Related: signing in with Google as `om.chavan501@gmail.com` creates a Veervrat account
*separate* from a credential account registered under the plus-alias — the app does not
auto-link on email match by design.

### OAuth clients — one per environment, deliberately

Split so that a UAT credential leak cannot authenticate against production; Terraform already
takes the client id and secret per environment.

| Client | Redirect URIs |
|---|---|
| `Veervrat — prod` | `https://api.veervrat.jnanaprabodhini.org/api/v1/auth/google/callback` |
| `Veervrat — uat + local` | `https://api.uat.veervrat.jnanaprabodhini.org/api/v1/auth/google/callback` and `http://localhost:3001/api/v1/auth/google/callback` |

⚠️ **Redirect URIs are on the `api` host, not the web host.** They moved there when the Next.js
rewrite proxy was removed (see `documentation/21_Infrastructure-Conventions.md` §17); the old
`https://veervrat.jnanaprabodhini.org/api/v1/...` form now returns 404. A mismatch fails with
`redirect_uri_mismatch` *after* the user has already approved — the least debuggable point in
the flow.

**Authorized JavaScript origins are intentionally empty.** The app uses the server-side
authorization-code flow via Passport; origins matter only for browser-side SDK flows.

### Where the credentials live

- Downloaded JSONs: `~/.secrets/veervrat/veervrat-prod-client.json` and
  `veervrat-uat-and-local-client.json` — mode 600, **outside the repo**.
- The **client secret** is a Key Vault secret (`google-client-secret`) per environment, set out
  of band; see `documentation/21_Infrastructure-Conventions.md` §20.
- The **client ID** is not a secret — it is sent to the browser on every sign-in — so it lives
  in Terraform as a plain variable.

### Console path, as of 2026-08-17

The flow was rewritten and no longer matches most guides:

1. **Google Auth Platform → Branding → Get started** — a four-step wizard (App Information →
   Audience → Contact Information → Finish). This creates only the consent configuration.
2. The rest are **separate sidebar pages**, not continuations of the wizard:
   **Audience** (user type, publishing status, test users), **Data access** (scopes),
   **Clients** (create OAuth clients).
3. Each panel has its own **Save / Update** button. Closing a panel without pressing it
   discards silently — check the page behind shows the change before moving on.
