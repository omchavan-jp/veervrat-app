# Azure / Microsoft Account — Source of Truth

Operational reference for Jnana Prabodhini's Microsoft tenant and the Veervrat Azure setup.
**This is the base truth.** If something here disagrees with memory, this file wins — and if
reality diverges from this file, update the file in the same session.

Last verified: **2026-08-16**

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
| Status | Active · **UAT running** (app live 2026-08-16); prod not yet created |
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
| `veervrat-prod` | *(not yet created — Phase 2B)* | | mirrors `veervrat-uat` |

Environments are split by **resource group**, not by subscription (D12). Shared,
cross-environment resources live in `veervrat-shared`.

### Container Registry — `veervratacr`

Basic tier (~$5/mo), `admin_enabled=false` — **no admin password exists**; apps pull via
user-assigned managed identity with AcrPull. Created by Terraform 2026-08-16. Contents
listed under the UAT section below.

### Per-environment Key Vaults — `veervrat-uat-kv` (prod's counterpart lands with Phase 2B)

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
  App URLs are `https://<app-name>.<default-domain>`, i.e. **predictable before the apps
  exist** — which is what lets the web image be built knowing the api's URL, since
  `NEXT_PUBLIC_*` is baked in at build time.

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
| Identities | `veervrat-uat-api-id`, `veervrat-uat-web-id` | user-assigned; AcrPull on the registry, api additionally Key Vault Secrets User. **No registry password or connection string anywhere** |
| Alerting | `veervrat-uat-ops` + `veervrat-uat-psql-storage` | storage > 80%, hourly → `om.chavan@jnanaprabodhini.org` |

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

## 8. ⏳ Open decision — subdomain vs path

Raised 2026-08-15: should Veervrat live at **`veervrat.jnanaprabodhini.org`** (subdomain) or
**`jnanaprabodhini.org/veervrat`** (path on the existing site)?

**Technical recommendation: subdomain.** Not a close call.

| | Subdomain | Path |
|---|---|---|
| Setup | one DNS record (or NS delegation) | **reverse proxy** on JP's existing web server |
| Dependency | none on JP's site | JP's site becomes a **hard dependency** — their outage = our outage |
| Code | no change | Next.js `basePath` change + asset/route rework |
| SSL | independent, auto-renewing | managed by JP's host |
| Cookies | isolated to the subdomain | **shared with the main JP site** — real security concern |
| Email (Resend) | SPF/DKIM on our own subdomain, **zero risk to JP's Google Workspace mail** | records must go on the **root domain** — risks JP's live mail |
| Debugging | direct | through someone else's proxy |

The email point alone is close to decisive: path-based hosting would force our mail records onto
the root domain that carries JP's Google Workspace mail.

**Who decides what:** the subdomain-vs-path choice is **technical → Rahul**. Whether Veervrat sits
under JP's identity at all (vs a standalone `veervrat.com`) is **institutional → Ashutosh/Nachiket**.

**Blocks:** DNS setup, HTTPS certs, WebSocket chat fix, Resend domain verification.

---

## 9. Other providers (still live from the Railway era)

| Service | Purpose | Status |
|---|---|---|
| **Neon** | Postgres (us-east-1, PG 18.4) | live — ⚠️ **migration CANCELLED 2026-08-16 (D19)**; dump kept as an archive only. Decommission once nothing references it. |
| **Upstash** | Redis (us-east-1) | live |
| **Cloudflare R2** | object storage, bucket `veervrat-uploads-dev` | live, **empty** |
| **Google Cloud** | OAuth client (Google sign-in) | live |
| **Resend** | transactional email | account not yet created — never wired |
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

**Next**
- [ ] Terraform Phase 2B — mirror Phase 2A's module to `veervrat-prod`
- [ ] Small app change: swap `@aws-sdk/client-s3` for `@azure/storage-blob` in
      `apps/api/src/modules/uploads/uploads.service.ts` (currently speaks the S3 protocol,
      which Azure Blob does not) — blocks provisioning Blob Storage
- [ ] CD pipeline — builds/pushes images to `veervratacr`, which then unblocks the actual
      `web`/`api` Container Apps (the Container Apps *Environment* exists; the apps don't yet)
- [ ] Update `infra-budget-log.md` target architecture: "Azure Cache Basic C0" → Azure Managed
      Redis `Balanced_B0` (the former no longer accepts new deployments — see §5)
- [ ] Turn **off** Elevate access (root-scope UAA) — redundant now
- [ ] Devavrat to **verify the billing email** (currently "Not verified" → notifications may not deliver)
- [ ] Decide **subdomain vs path** with Rahul (section 7)
- [x] DNS via **Rahul** → Shantanoo: done 2026-08-16, per-record instead of NS delegation
      (met Shantanoo directly — see `ops/PROJECT-STATUS.md` O1/D14)
- [ ] Consider adding JP's PAN/GSTIN to the billing account (Tax ID currently "None provided") — ask finance
- [ ] After Phase 2B: data migration → Resend

See `infra-budget-log.md` for the decision trail and budget analysis.

See `infra-budget-log.md` for the decision trail and budget analysis.
