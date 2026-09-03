# Infra & Budget Working Log

**Running log for the budget proposal still owed to JP finance/seniors.** Not transient —
this is the evidence base for that document, and it keeps accumulating real numbers as they
are discovered.

Origin: the original task was to compile a professional budget for JP. That work uncovered
the Microsoft nonprofit grant (US$2,000) and the option to reuse `jnanaprabodhini.org` via a
subdomain, which redirected effort into claiming the grant and building the deployment. The
proposal itself is still outstanding — see issue #84.

> 📌 **Superseded decisions below.** This log records what was believed *at the time* — that is
> its value as an evidence base, so it is not rewritten. Two entries have since changed: email
> moved from **Resend → JP IT's SMTP relay** (D9, 2026-08-17), and the **Neon data migration was
> cancelled** (D19). `PROJECT-STATUS.md` is authoritative for current decisions.

⚠️ **An earlier header said "delete once infra decisions are finalised". That was wrong** and
nearly cost the file: the decisions *are* finalised, but this is the reference the proposal
will be written from. Its value is highest now, not lowest.

Writing the proposal is now much easier than when it was planned: we have **actuals**
(~$56/mo for UAT + prod normal running) rather than estimates, plus a documented trail of what
each choice cost and why alternatives were rejected.

⚠️ **2026-09-02: a ₹19,230 cost spike from a BullMQ/Redis misconfiguration.** Not normal
running cost — a one-off incident from Log Analytics ingestion (see §below). `daily_quota_gb`
now guards against repeats. Grant consumption is ~₹20,700 (~10.8%) after the incident.

---

## Why this exercise

Railway free trial expired → app is currently **down**. Rather than re-deploy the same
spread-out free-tier stack, consolidating onto one cloud with Infrastructure-as-Code, so
a real budget number can be handed to a cost reviewer.

Trigger: reel arguing vibe-coders over-distribute services; real engineers pick one cloud
and describe it as code.

---

## Starting state (as of 2026-08-09)

| Piece | Provider | Region | Status |
|---|---|---|---|
| web + api | Railway | US West | **REMOVED** (trial expired) |
| Postgres | Neon | us-east-1 | live, PG 18.4 |
| Redis | Upstash | us-east-1 | live |
| Objects | Cloudflare R2 | global | live, bucket `veervrat-uploads-dev` |
| Email | Resend | — | **never wired** — verification/reset mails have never worked |
| Search | Meilisearch | — | never deployed; search degraded by design |
| OAuth | Google Cloud | — | live |
| CI | GitHub Actions | — | live (`ci.yml`, `integration.yml`) — **gates only, no CD** |
| IaC | none | — | **nothing exists** |

Prod data (2026-08-09): 12 users, 10 journeys, 35 weaknesses, 32 sessions.

---

## Findings from code inspection

1. **No Socket.IO Redis adapter.** `ioredis` present, no `createAdapter`. Chat gateway is
   single-instance-only; a second api replica silently breaks message delivery.
2. **Chat also broken in prod for a second reason:** Next.js rewrites (`/api/v1/* →
   API_ORIGIN`) do not proxy WebSocket upgrades. Fixed by a shared custom domain, not by code.
3. **Both Dockerfiles exist** (`apps/api`, `apps/web`) → portable to any container host.
   This is the key asset that makes migration a config change, not a rewrite.
4. **Object storage holds nothing yet — verified 2026-08-09.** Full URLs *are* stored in
   the DB (uploads service composes them from `S3_PUBLIC_URL`), which initially looked like
   a 3-part migration (SDK swap + file copy + data migration). But every URL-bearing column
   is empty: `resources.url=0`, `resources.file_path=0`, `resources.thumbnail_url=0`,
   `uploads.minio_url=0`, `users.avatar_url=0`. **Migrating object storage today is a pure
   SDK rewrite of one service, with zero data migration.** This is the cheapest it will ever
   be — every future upload raises the cost. (Also: `minio_url` is a stale column name from
   the local-dev MinIO era — rename while in there.)
5. **Region split is the biggest unforced error:** compute in US-West, DB in us-east-1,
   users in Maharashtra. ~70ms cross-US per query *plus* ~250ms to India.
6. Secrets (`.env.railway`) hold a live GitHub PAT, Google client secret, R2 keys, session
   secret. **Never committed to git** (verified) but sitting plaintext on disk → move to a
   secret manager, rotate the PAT at cutover.

---

## Production-readiness audit of the app (2026-08-15, code-grounded)

Done *before* Terraform deliberately — so infra isn't built around today's workarounds.

**Verdict: not a rebuild.** Dockerfiles are genuinely production-grade (multi-stage, non-root,
pruned deps, Next standalone, openssl for Prisma). No local FS writes, no module-level caches →
genuinely stateless. Pino → stdout in prod. Health/ready exist and bypass the global prefix.
**Correction to the docs: Resend IS coded** (`email.service.ts`, SDK + console fallback) — only the
account, API key and verified domain are missing. `19_Email-Strategy.md`/DEPLOYMENT.md are stale.

### Must fix — genuinely break on Container Apps

| # | Finding | Evidence | Impact |
|---|---|---|---|
| 1 | **No graceful shutdown** | `enableShutdownHooks()` never called in `main.ts`; `PrismaService.onModuleDestroy` therefore never fires | Every deploy SIGTERMs the container → in-flight requests killed, DB connections dropped mid-query. **Errors on every deploy.** |
| 2 | **Rate limiting is in-memory** | `ThrottlerModule.forRoot([{...}])`, no storage → default in-memory | Counters are **per-replica**: 2 replicas ⇒ 2× the intended limit; resets each deploy. Security control that silently weakens as you scale. Redis already present. |
| 3 | **Socket.IO has no Redis adapter** | `chats.gateway.ts`; no `createAdapter` anywhere | >1 replica ⇒ messages silently don't reach half the users. Pin max-replicas=1 until fixed. |
| 4 | **Uploads are S3-shaped** | `uploads.service.ts` uses `@aws-sdk/client-s3` | Azure Blob doesn't speak S3. Free to migrate today (0 files, 0 stored URLs); cost grows with every upload. Switch to managed identity ⇒ no keys. |
| 5 | **Unbounded DB connections per instance** | `PrismaPg(process.env.DATABASE_URL)`, no `connection_limit` | ~10 conns/replica by default; Burstable Postgres has a low `max_connections`. Several replicas ⇒ pool exhaustion, everything fails at once. Set an explicit limit + enable PgBouncer. |

### Cleanups the migration enables

6. **Delete the Next.js `/api/v1/*` proxy** — highest-value single change. It exists *only* because
   `*.up.railway.app` made web/api cross-site. A shared parent domain makes cookies first-party ⇒
   drop the proxy **and** `COOKIE_SAMESITE=lax`. **Also fixes WebSocket chat**, since Next rewrites
   can't proxy upgrades. One change, three problems.
7. **Migrations → Container Apps Job** triggered by CI behind a manual-approval gate. Honours the
   "never auto-migrate prod" rule *better* than today's laptop `docker run` — logged and repeatable.
8. **Secrets → Key Vault + managed identity**; rotate the exposed PAT/session secret at cutover.
9. **One error tracker:** GlitchTip is wired but never deployed. **Application Insights** is native
   and grant-covered → switch, drop the Sentry SDK.
10. Minor: CORS origin, gateway CORS and Prisma read `process.env` directly rather than
    ConfigService ⇒ no boot-time validation for those values.

### Sequence
**Round 1 — app fixes (1,2,3,5):** small, locally testable, Azure-independent. One branch.
**Round 2 — Terraform** against the fixed app.
**Round 3 — at cutover (4,6,7,8,9).**

---

## Target architecture (settled 2026-08-15, Case A confirmed)

**Organising principle: stateless things we run, stateful things we buy.**
Stateless (web/api) = losing an instance loses nothing → containers, scale to zero.
Stateful (Postgres/Redis/Blob) = holds the only copy → managed PaaS.

| Component | Choice | Why |
|---|---|---|
| web + api | **Container Apps** (Consumption) | Existing Dockerfiles run as-is; scale to zero |
| Postgres | **Flexible Server**, Burstable B1ms (~$13/mo) | Containers have no durable disk; PG on network storage risks corruption; managed brings **automated backups + PITR**, which closes the audit's "Backups: MISSING" gap for ~$5/mo over a bare VM |
| Redis | **Azure Managed Redis, `Balanced_B0`** (~$12/mo) | ⚠️ **CHANGED twice.** First Upstash → "Azure Cache Basic C0"; then, mid-Terraform-build (2026-08-16), Azure retired Azure Cache for Redis entirely — the API rejects new deployments. `Balanced_B0` is its replacement's smallest tier, confirmed via Azure's live retail pricing API at $0.017/hr, actually cheaper than the C0 estimate. Data is disposable (lockout/rate-limit counters, cache — sessions are in Postgres), but scale-to-zero would kill a self-hosted one anyway, so min-replicas=1 costs the same without the ops. **No SLA/replica at this tier** → revisit a larger tier at launch. |
| Objects | **Azure Blob** | Confirmed Case A; migration is free today (no files, no stored URLs); managed identity removes static keys |
| Images | **ACR Basic** (~$5/mo, 10 GB) | Flat tier rate, **not per-push**. Same-region pulls are free. |
| Secrets | **Key Vault** + managed identity | No static credentials anywhere |
| Search | **deferred**; when needed → Container Apps, ephemeral, **re-index on boot** | No Azure PaaS equivalent, but a search index is *derived data* — rebuildable from Postgres, so no durability need and no VM |
| Email | ~~Resend~~ → **JP IT SMTP relay** (D9, 2026-08-17) | Replaced Resend; no third-party account, no per-message ceiling |

**Kubernetes: yes, but Microsoft's.** Container Apps *is* AKS + KEDA + Envoy underneath. Self-run
AKS would add 24/7 node cost (~$70/mo min, **no scale-to-zero**), upgrades, YAML, and on-call —
for two services and one maintainer. Revisit at 10+ services or a dedicated platform owner.

**Zero VMs** in dev / UAT / prod. VMs mean owning the OS and paying 24/7.

**Environments:** one subscription, staging + prod as separate **resource groups**.

### Deliberately staged for later (not forgotten)
1. **VNet + private endpoints** for Postgres/Redis — before public launch. Beta uses firewall +
   TLS + credentials (DBs are *not* internet-open either way). Private endpoints cost ~$7/mo each
   (~$15 total) and add debugging complexity — not worth it at beta.
2. **Redis Basic → Standard** when chat and real traffic arrive.
3. **ACR purge schedule** (keep last ~10 tags) — the only thing that could inflate registry cost.
4. **Socket.IO Redis adapter** before ever running >1 api replica.

### Provider registration
9 registered 2026-08-15. ⚠️ **Verify `Microsoft.Storage` and `Microsoft.Insights`** — not visible
in the portal list. Storage is required both for Blob *and* for the **Terraform state backend**.
Unregistered providers cost nothing; no need to remove any of the auto-registered ones.

**Vendor count after this: Azure** (+ Google for OAuth + Sentry free tier). Down from five. ⚠️ This originally said "Azure + Resend" — Resend was replaced by JP IT's SMTP relay (D9, 2026-08-17).

---

## Architecture principles agreed

Not "one vendor" — the metric is *how many things can silently break and how many
dashboards you must visit to fix them*. Rules:

1. Everything in Terraform; rebuildable from zero.
2. Compute + database co-located, in an India region.
3. One vendor for the stateful core; consumption-priced SaaS allowed for edge concerns
   where a dedicated node is absurd (Redis) or economics are clearly better (R2 egress).
4. Exceptions must be *reversible config changes* (`REDIS_URL`, `S3_ENDPOINT`) to stay
   defensible.

Kubernetes deliberately rejected — Container Apps and Cloud Run are managed Kubernetes
underneath; self-operating K8s adds control-plane cost, 24/7 nodes (no scale-to-zero) and
a large YAML/ops surface for a 2-service app with one maintainer.

---

## The two budget cases

**Case A — Microsoft nonprofit Azure grant approved** ($2,000/yr = $166/mo credit)
→ Azure Container Apps + Postgres Flexible Server + Azure Cache for Redis, `centralindia` (Pune).
Grant covers the Azure bill **through public launch**; real spend starts ~10k users.
Net cash: ~$1/mo (beta) → ~$22/mo (launch) → ~$187/mo (growth).

**Case B — no grant** → GCP Cloud Run + Cloud SQL, `asia-south1` (Mumbai), keep Upstash.
Net cash: ~$32/mo (beta) → ~$130/mo (launch) → ~$338/mo (growth).

Architecture is identical in both; only the compute/DB vendor swaps. Deciding later costs
nothing now.

**Rejected: paid version of the current spread stack** — Railway Pro + Neon Launch +
Upstash + Resend ≈ $70–90/mo, i.e. *more* than consolidated cloud, because you pay a base
platform fee four times (~$49/mo of pure subscription before a single request).

---

## Grant eligibility — assessment

### Registration details

Source: **jnanaprabodhini.org**, JP's own official website (read 2026-08-10) — self-published
by the organisation, so reliable for planning. Not yet confirmed with JP IT, and the actual
certificates still need to be obtained in hand before applying.

| Field | Value |
|---|---|
| Registered name | Jnana Prabodhini |
| Address | 510, Sadashiv Peth, Pune – 411030, Maharashtra |
| Society registration | **Bom/418/Poona/63** — Societies Registration Act, 1860 |
| Public trust registration | **F-254 (Pune)** — Maharashtra Public Trusts Act, 1950 |
| PAN | AAATJ1195M |
| Tax status | 12A + 80G (80G ref. AAATJ1195MF20214) |
| Other | FCRA registered; CSR-1 (CSR00002565) |

**Dual registration (Society + Public Trust) is the strongest, most standard Indian NGO
form** and maps cleanly onto Microsoft's "recognized legal entity equivalent to 501(c)(3)"
test. Overseen by the Maharashtra Charity Commissioner.

### The education-exclusion risk — now looks manageable

Microsoft excludes schools, colleges and universities (routed to academic licensing).
The exclusion targets organisations that *are* formal educational institutions, not
organisations that *do* educational work — otherwise most NGOs would fail.

JP works across **eight dimensions**: Education, Research, Rural Development, Health,
Awakening of Woman Power, Leadership Development, National Integration, Social
Entrepreneurship. Active across most districts of Maharashtra (Pune, Nigdi, Salumbre,
Solapur, Harali, Ambajogai). Education is one of eight, not the identity of the org.

→ **Assessment: likely eligible.** Residual risk is a validator glancing at the website,
seeing Prashala, and misclassifying it as a school.

### Application framing (to reduce that risk)

- Apply as **"Jnana Prabodhini"**, the parent society/trust (Bom/418/Poona/63 + F-254).
- Describe it as a **multi-sector charitable organisation** — lead with the eight
  dimensions, rural development and research; do **not** lead with Prashala or schools.
- Describe Veervrat as a **personal-development / psychology programme**, which genuinely
  ties to *Prajna Manas Samshodhika* (JP's Institute of Psychology, a PhD research centre
  in motivation, creativity, leadership and psychometrics) rather than to school teaching.
- Fallbacks if rejected: clarify and appeal; or apply via a clearly non-educational sibling
  entity (Sanshodhan Sanstha – research, Gram Prabodhan – rural development, JP Medical
  Trust); or fall back to Case B.

### Documents to gather

Registration certificates (both society and public trust), MOA / bylaws / trust deed, PAN,
12A and 80G certificates, a recent annual report or audited financials, and the org website.

⚠️ **Microsoft's India-specific document list was not found** — web search returned only
generic 12A/80G guidance. Confirm the actual requirements inside `nonprofit.microsoft.com`
at application time rather than relying on the list above.

---

## Domain

| Option | Cost/yr | Notes |
|---|---|---|
| `veervrat.jnanaprabodhini.org` | ₹0 | Preferred. Ask for one-time **NS delegation** so we control records beneath it without repeat requests. |
| `veervrat.com` | ~$10.44 (Cloudflare) / ~$15 (Namecheap) | **Verified available 2026-08-09.** Buy defensively. |
| `veervrat.org` | ~$12–15 | **Verified available.** |
| `.in` / `.org.in` | ~₹700–1,200 | Availability unverified — registry whois didn't respond. |

Domain gates: WebSocket chat fix, cookie simplification (`SameSite=lax`), OAuth callback
cleanup, and Resend domain verification.

---

## Decisions log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-09 | Consolidate onto one cloud + Terraform | Free-tier sprawl died with the trial; no backups, no IaC, 4 dashboards |
| 2026-08-09 | Target an India region | Biggest real UX win; current setup serves Maharashtra from US |
| 2026-08-09 | ~~Keep R2 even under Case A~~ | **SUPERSEDED** — rested on a migration cost that turned out to be zero (no files, no stored URLs) |
| 2026-08-09 | Object storage decision now splits by case | **Case A → move to Azure Blob** (migration is free today; managed identity removes static access keys entirely; one fewer vendor; cleaner eventual handover to JP IT). **Case B → keep R2** (paying cash, so zero egress is worth real money, and GCS would need its own rewrite *and* charges egress). Azure's 100GB/mo free egress means egress only bites at growth scale, by which point the grant is exhausted anyway. If Case A lands, migrate **before launch**. |
| 2026-08-09 | Reject Kubernetes | Managed serverless containers are K8s underneath, without the ops burden |
| 2026-08-09 | Skip CDN / Front Door for now | Own audit calls advanced edge logic premature |
| 2026-08-09 | Neon backup taken | `backups/veervrat-neon-20260809T184831Z.dump` (pg_dump -Fc, 243K, 50 tables) |
| 2026-08-09 | Stopgap: Render free tier, no IaC | Throwaway; Terraform written once against the final provider |
| 2026-08-23 | **Drop Azure App Insights** | It was the only Azure-coupled piece of the observability plan and was never started — no code, no Terraform, no resource. Its value (traces, platform metrics) is what any replacement provides anyway, so adopting it would only buy instrumentation that has to be rewritten on the day the platform changes. Logs already go to stdout, which every platform collects |
| 2026-08-23 | **Sentry free tier for error tracking, EU region** | Cost ₹0 (Developer tier: 5,000 events/month, 1 user). Chosen for the *protocol*, not the vendor: GlitchTip speaks it, so self-hosting later is a change to `SENTRY_DSN` and nothing else. EU over US because GDPR protections apply by default and US providers are reachable under the CLOUD Act. ⚠️ **First and only data that leaves India** — the published privacy policy must be amended |
| 2026-08-23 | **Error monitoring only; Logging/Tracing/Profiling/Metrics off** | The free tier is 5,000 events a month. Spending it on traces nobody reads would exhaust the quota for the one thing that matters. `tracesSampleRate` set to 0 to match the product toggle |
| 2026-08-23 | **Self-hosted GlitchTip deferred, not rejected** | Would keep everything in India and add no third party, but needs a web container, a worker, Postgres and Redis — real monthly cost and real maintenance on a grant budget, for a service whose job is to be boring. Revisit if data localisation becomes a hard requirement |
| 2026-08-24 | **Azure Blob Storage account provisioned** (#139, O15 executed) | One Standard LRS storage account + container per environment (`veervratuatuploads`, `veervratproduploads`), Central India — same region as everything else, so this does not affect residency the way Sentry does. Reached via the api's managed identity; no access key exists anywhere for it. **Cost not yet measured** — negligible at the near-zero upload volume both environments currently hold (chat images only; avatars are not built). Confirm against the first real Azure invoice rather than an estimate here; this doc has already been burned once by a stale pre-launch guess (Redis SKU renamed and repriced, see §5) |
| 2026-08-24 | **GitHub Actions billing failure forced an unplanned repo transfer** | `veer-vrat` (personal account) hit a payments/spending-limit block mid-session, well before the documented 2,000 min/month free-tier cap was reached on paper. Repo moved to `omchavan-jp` as a stopgap — same account family, so no cost, but real one-time friction: OIDC federated-credential subject had to be re-registered (GitHub's post-transfer subject format is `owner@id/repo@id`, not the plain path — see `documentation/21_Infrastructure-Conventions.md` §15), and CI needed a new, narrowly-scoped `User Access Administrator` grant to create that credential's dependent role assignments itself. A further move to `jnanaprabodhini` (JP's own org) is planned once that org accepts a transfer (#132) — worth doing sooner rather than later, since the org's own billing would avoid this exact failure recurring on a personal card |

---

## Open questions

- [ ] Does JP qualify for the Microsoft nonprofit grant, and **under which entity**?
- [ ] Is JP already verified on `nonprofit.microsoft.com` (often true if they use M365 nonprofit)?
- [x] ~~Who runs DNS for `jnanaprabodhini.org`~~ → Shantanoo Mahajan, per-record CNAMEs (D14)
- [x] ~~What infra do the existing JP sites use~~ → answered; grant secured
- [x] ~~Existing mail setup~~ → JP IT relay (`dhoomketu.in:587`), no SPF/DKIM conflict (D9)
- [x] ~~Subdomain vs `veervrat.com`~~ → subdomain; `veervrat.jnanaprabodhini.org` live
- [ ] Rotate the GitHub PAT + session secret at cutover (O12)
- [ ] Does anyone actually read `veervrat@jnanaprabodhini.org`? Sentry alerts go there, and an alert channel nobody watches is not an alert channel
- [ ] Sentry free tier is 5,000 events/month and **drops events past it** — a single looping error can exhaust it. Watch the first month's volume before assuming the tier fits

---

## Microsoft nonprofit registration — in progress

**2026-08-10: JP IT gave the go-ahead to register Jnana Prabodhini at
`nonprofit.microsoft.com`.** Om is the applicant.

**Blocking pre-check: ✅ CLEARED (2026-08-10).** JP has nothing on Microsoft — they run
**Google Workspace**. Clean slate, no duplicate-tenant risk, safe to create a new tenant.

### 🔄 SUPERSEDED (2026-08-10, later the same day): JP is ALREADY registered

Om called Ashutosh → referred to **Devavrat** (another dept) → **Jnana Prabodhini is already
registered on nonprofit.microsoft.com.** A tenant already exists. No new registration needed;
the identity decisions below are moot except as background.

**Call scheduled with Devavrat: 2026-08-11, 2–3pm.**

⚠️ **Budget impact:** Case A assumed the full **$166/mo** of grant credit was ours. It is a
**single shared pool per tenant.** If another department is already consuming it, the Case A
numbers change. *Establishing remaining headroom is the main objective of the call.*

#### Call agenda — questions in priority order

**Decisive:**
1. Is the nonprofit validation **approved and currently active**? (registered ≠ approved ≠ still valid; renews annually)
2. Has the **$2,000 Azure grant been claimed and activated**? States: never claimed / active / lapsed. (90-day activation window, no rollover, annual renewal)
3. **How much credit is currently consumed, by what, and what is the renewal date?** How much headroom remains for Veervrat?

**Access & structure:**
4. Tenant name (`___.onmicrosoft.com`) and who the global admins are.
5. Does an Azure **subscription** exist — specifically an *Azure Sponsorship* subscription (how the grant manifests)?
6. Any workloads running today, or dormant?
7. Is M365 nonprofit in use? (indicates how live the tenant is)

**The ask:**
8. **A dedicated subscription for Veervrat** under the same tenant (clean cost + quota isolation). Fallback: a dedicated resource group.
9. Who approves spend beyond the grant, and what notice is needed?
10. **Is `jnanaprabodhini.org` verified as a domain in the Microsoft tenant?** Decides whether Om's account is `om@jnanaprabodhini.org` or `om@<tenant>.onmicrosoft.com`. Either works.

#### Access model to request (decided 2026-08-10)

Three separate identities — deliberately not shared:

| Role | Who | Rationale |
|---|---|---|
| **Contributor** (build/debug) | **Om, on a JP-issued account** | Production access must be org-owned and revocable at offboarding. **Not** `om.chavan501@gmail.com` — guest/B2B works technically but is poor practice for prod infra and awkward to govern. |
| **Owner** (access + cost visibility) | **Nachiket Nitsure** | Leads Veervrat; must control access and see spend independently. Avoid the developer being the only one who can get in. |
| **Deployments** | **Service principal**, federated OIDC | No human credentials in the pipeline. |

❌ **Never assign a role to `veervrat@jnanaprabodhini.org`.** Shared mailboxes break audit
accountability — logs can't attribute actions. Notification/contact address only.

**Bring:** Veervrat needs ~**$57/mo** Azure at beta, ~**$132/mo** at launch, vs $166/mo credit
— fits inside the grant through public launch. Region wanted: **Central India (Pune)**. App is
currently down with beta testers waiting.

#### Access setup progress (2026-08-14)

- ✅ JP IT created **`om.chavan@jnanaprabodhini.org`** (Google Workspace) — the org-owned
  identity we asked for, replacing any use of the personal Gmail.
- ✅ JP IT created **`om.chavan@jppune.onmicrosoft.com`** (Entra/Azure).
- ✅ **Tenant name confirmed: `jppune.onmicrosoft.com`** (answers call question 4).
- ✅ JP IT has applied for the nonprofit.microsoft claim.
- 🚧 **BLOCKED: cannot sign in to portal.azure.com.** `AADSTS50079` — MFA enrolment required,
  but `mysignins.microsoft.com/security-info` → "Add sign-in method" returns **"No methods
  available"**. Tenant-level Authentication Methods policy has nothing enabled/scoped for the
  account, so self-enrolment is impossible. (The `Email` method shown is SSPR-only and cannot
  satisfy MFA.) **Admin-side fix required** — asked IT to enable Microsoft Authenticator (+
  third-party OATH) in Entra → Protection → Authentication methods → Policies, or, if the
  tenant is still on legacy per-user MFA, tick the mobile-app options under service settings.

Still unanswered from the call agenda: grant claimed/active state, **current credit
consumption and remaining headroom (Q3 — the decisive one)**, whether an Azure Sponsorship
subscription exists, and the dedicated-subscription ask.

#### Azure portal audit — findings (fill in, 2026-08-15)

MFA unblocked 2026-08-15 (IT enabled the auth-method policy); portal sign-in works.

**Identity — ✅ CONFIRMED**
- Tenant name: **Jnana Prabodhini**
- Tenant ID: **`5273b83c-0127-473f-bc58-a6f0d3c75ab1`**
- Tenant domain: `jppune.onmicrosoft.com`
- Country: India · Data location: **Asia datacenters** (good — matches our Central India target)
- Technical contact / tenant admin: **`devavrat.munagekar@jnanaprabodhini.org`**
- My account: `om.chavan@jppune.onmicrosoft.com`
- **Security defaults: ON** — correct baseline; caused the MFA requirement. Leave enabled;
  does not affect CI/CD service principals (federated creds are out of scope for it).

**Access — Om is NOT Global Admin (corrected 2026-08-15)**
- Entra Properties showed "Om Chavan can manage access to all Azure subscriptions and
  management groups" = **Elevate access / User Access Administrator at root scope `/`**.
  Initially misread as Global Admin.
- `nonprofit.microsoft.com` rejects the account: *"not a Microsoft 365 Global Administrator"*.
  Root-scope UAA is an **Azure-resource** grant only — no rights in the nonprofit portal or
  M365 admin center.
- It confers the ability to *grant* access, **not** access to resources. Bootstrap only.
- **Decision: do NOT request tenant-wide Global Admin.** Devavrat (Global Admin) claims the
  grant; Om + Nachiket get **Owner on the Veervrat subscription** once it exists. Elevate
  access switched back OFF afterwards. Right scope, far less blast radius.

**Initial dead ends (2026-08-15) — all artefacts of Om's lack of access, not absence of a grant**
- Subscriptions blade: empty · Billing scopes: no billing accounts
- `microsoftazuresponsorships.com/Balance`: *"no active Sponsorship"* — **misleading**: that page
  only tracks the legacy `MS-AZR-0143P` offer. Modern nonprofit grants arrive as **credits on an
  MCA billing profile**, which that page cannot see.

---

## ✅ CASE A CONFIRMED — grant is live (2026-08-15)

Evidence: two emails to `admin@jppune.onmicrosoft.com` on 2026-08-14.
1. 17:49 — *Microsoft Elevate*: **USD 2,000 Azure grant added for Jnana Prabodhini**,
   **expires 14 August 2027**, renewal notice a few weeks prior.
2. 17:54 — Devavrat clicked **Activate** → *"Your Azure subscription is ready"*, subscription
   `3ffcc513-dca6-453c-b9ff-83b096ea1381` / "Azure subscription 1".

→ The subscription **is** the grant subscription (created by the Activate flow, five minutes apart).

| Field | Value |
|---|---|
| Tenant | Jnana Prabodhini · `5273b83c-0127-473f-bc58-a6f0d3c75ab1` · `jppune.onmicrosoft.com` |
| Subscription | `3ffcc513-dca6-453c-b9ff-83b096ea1381` ("Azure subscription 1" — rename pending) |
| Plan | **Azure Plan (MCA)** — *not* legacy Sponsorship |
| Om's role | **Owner** (RBAC, subscription scope) ✅ |
| Grant | **USD 2,000**, expires **2027-08-14**, renewable |
| Current cost | 0.00 · forecast 0.00 · **no resources — clean slate** |
| Data location | Asia datacenters (aligns with Central India target) |

**Budget headroom: the full $166/mo.** No other department is consuming it. Veervrat needs
~$57/mo at beta and ~$132/mo at launch → **the grant covers everything through public launch.**

**Open: credits blade renders empty for Om.** Expected — **MCA billing roles are a separate
system from RBAC**; subscription Owner grants no billing-account visibility. Also 24–48h
propagation. Not evidence of a missing grant.

**Currency: INR.** Billing profile shows **₹1,96,000** (~₹98/USD). Restated budget:
beta **~₹5,600/mo** · launch **~₹12,900/mo** · credit **~₹16,300/mo**. Monthly invoicing,
next invoice 2026-09-09. Subscription type: *Usage based · Microsoft Azure Plan*, purchased
2026-08-14.

### Access resolved (2026-08-15)

Three **independent** permission systems — a recurring source of confusion, worth remembering:

| System | Controls | Om |
|---|---|---|
| Entra directory roles | identity, tenant settings, nonprofit portal | **Global Administrator** ✅ |
| Azure RBAC | resources (deploy/configure/delete) | **Owner** on subscription ✅ |
| MCA billing roles | credits, invoices, payment methods | **Billing account owner** ✅ |

Global Admin grants **neither** of the other two — no inheritance, and (unlike RBAC's "Elevate
access" toggle) no back door into billing. All three had to be assigned separately.

**Rationale for Global Admin** (vs. the narrower Application Developer): tenant holds **no M365
data** — JP runs Google Workspace, so it is Azure-only; the 2027 grant renewal *requires* Global
Admin at `nonprofit.microsoft.com`; and Microsoft's own guidance is 2–4 global admins (a single
one is flagged in the security score). **Devavrat retains Global Admin** — never a single admin.
⚠️ Revisit and scope down if JP ever moves email/files into this tenant.

**Billing account + profile were auto-named "Devavrat Munagekar"** (named after whoever clicked
Activate) → renaming both to *Jnana Prabodhini*; the profile name prints on monthly invoices.

### Om's checklist (post-call, 2026-08-15)

- [ ] Sign out/in to refresh the token; verify via `nonprofit.microsoft.com` + Billing scopes
- [ ] Record credit balance + expiry from Billing profile → **Credits**
- [ ] Rename billing account → *Jnana Prabodhini*; profile → *Jnana Prabodhini*; subscription → `veervrat`
- [ ] Register 9 resource providers (App, OperationalInsights, DBforPostgreSQL, Cache,
      ContainerRegistry, KeyVault, Storage, ManagedIdentity, Insights)
- [ ] Budget: **₹13,000/mo**, alerts 50/80/100% actual, to Om + Nachiket
- [ ] Payment methods — card attached or not? (decides suspend-vs-bill at credit exhaustion)
- [ ] Calendar reminder **July 2027** — grant renewal, no rollover
- [ ] Add Nachiket as subscription Owner (needs a JP Microsoft account first)
- [x] DNS: message **Shantanoo Mahajan** — done 2026-08-16, per-record instead of NS delegation (see `ops/PROJECT-STATUS.md` O1/D14)

**Env/environment strategy:** one subscription, staging + prod separated by **resource group** —
simpler and cheaper than two subscriptions, and the grant bills at account level regardless.

**Subscription — ❌ NONE EXISTS (2026-08-15)**
- Subscriptions blade is empty. Tenant ≠ subscription: the directory exists (created for the
  nonprofit/M365 registration), but no Azure subscription has ever been provisioned.
- ✅ **Budget consequence: nobody is consuming the grant. Full $2,000 available if activated
  — headroom is 100%, not a shared slice. Call question 3 is effectively answered.**
- To confirm conclusively: (a) Subscriptions → global filter → all directories + all states;
  (b) Cost Management + Billing → Billing scopes (no billing account = never provisioned);
  (c) `microsoftazuresponsorships.com` → "no sponsorships found".

**Blocking step: the grant claim has two stages, easily conflated**
1. Nonprofit **validation approved** ← IT applied for this; status unknown
2. Azure grant **claimed + activated** ← *this is what creates the subscription; not done*

Next: sign in to `nonprofit.microsoft.com` and check validation status; if approved, claim the
Azure grant. **90-day activation window** once issued.

**Once the subscription exists, still to record:**
- Name / ID / Offer ID (`MS-AZR-0143P` = Sponsorship = the grant)
- **Spending limit On/Off** (On = app shuts down at credit exhaustion; Off = bills a card)
- Credit allocated / used / remaining + expiry (via `microsoftazuresponsorships.com`)
- Central India availability for Container Apps / Postgres Flexible / Redis / ACR

**Actions taken**
- [ ] Resource providers registered: Microsoft.App, OperationalInsights, DBforPostgreSQL,
      Cache, ContainerRegistry, KeyVault, Storage, ManagedIdentity, Insights
- [ ] Budget alert created: $150/mo, alerts at 50/80/100%, to Om + Nachiket
- [ ] ❌ No click-created infrastructure — all resources come from Terraform

#### Next steps by outcome

| Outcome | Action |
|---|---|
| Grant active + headroom | **Skip the Render stopgap.** Get subscription access → Terraform straight onto Azure. |
| Grant lapsed / unclaimed | Reactivate (should be quick — validation already exists), then same path. |
| Credit already consumed | Case A partially collapses → request top-up, split cost, or fall back to Case B (GCP). |

**Hold off on Render until question 3 is answered** — if Azure access lands in days, throwaway
stopgap work is wasted effort.

---

### Identity decisions (raised by JP IT, 2026-08-10) — now background only

IT asked whether the admin ID can be changed later, suspecting an app-specific ID is the
wrong choice. **Correct instinct.** Three distinct identities:

| Identity | What it is | Changeable |
|---|---|---|
| Primary contact email | Receives application/status mail (e.g. `veervrat@jnanaprabodhini.org`) | Yes, freely |
| Tenant admin account | Global admin of JP's whole tenant; a **new** `*.onmicrosoft.com` account, *not* their Google address | Yes — global admins can be added/removed anytime |
| **Tenant name** `jnanaprabodhini.onmicrosoft.com` | JP's permanent Microsoft identity | **NO — irreversible** |

Decisions:
- **Admin account: IT-owned and generic** (`admin@` / `itadmin@`), held by JP IT, *not* the
  Veervrat project and not person-named. This tenant is the org's Microsoft presence and may
  later carry M365 nonprofit licences org-wide.
- **Tenant prefix: `jnanaprabodhini`** — never `veervrat`. The only irreversible choice, so
  it's the one genuinely worth confirming with Ashutosh.
- **Create a second global admin immediately** post-setup as break-glass. Sole-admin lockout
  is the painful failure mode.

**Google Workspace is unaffected.** The tenant lives on `.onmicrosoft.com`; no DNS, no MX,
no domain verification needed. For Azure we never need to verify `jnanaprabodhini.org` in
Microsoft at all. JP email continues working untouched.

Requirements:
- **Primary contact email must be @jnanaprabodhini.org** (e.g. the existing
  `veervrat@jnanaprabodhini.org`). Domain match with the public website materially speeds
  validation; a Gmail address invites delays and document requests.
- Tenant prefix to choose (suggest `jnanaprabodhini.onmicrosoft.com`) + an admin account.
  Permanent org identity — pick deliberately. Distinct from the contact email.
- Org details: legal name, 510 Sadashiv Peth Pune 411030, jnanaprabodhini.org, reg numbers.
- Documents ready but requested only if automated validation is inconclusive: society cert
  Bom/418/Poona/63, public trust cert F-254, PAN, 12A, 80G.
- No credit card, no existing Microsoft account, no domain purchase needed.

Timeline: **3–7 business days**, up to ~2 weeks if documents are requested.

⏱️ **After approval: the $2,000 Azure grant is claimed separately in the portal and must be
activated within 90 days or it expires.** Do not approve → forget → lose it.

Apply using the framing above: multi-sector charitable organisation, not a school.

---

## Questions to raise on the call with JP IT

Deliberately **not** in the written enquiry — these are tradeoff/preference discussions
that go better verbally, and the first message is already at skim-length. Raise these once
a call is scheduled or the conversation opens up.

- [ ] **Governance preference on vendor count.** Would JP's IT rather everything sat in a
      single Azure subscription for manageability — even if a piece or two is marginally
      cheaper elsewhere? This is the one legitimate override for keeping Cloudflare R2 under
      Case A. Their answer decides it; there is no technical or cost argument either way at
      our scale.
- [ ] **Who owns this long-term?** If JP IT may inherit the app one day, that argues for
      fewer vendors and standard Azure tooling over a best-of-breed mix.
- [ ] **Is there an existing Azure subscription** we could deploy into, versus a fresh one
      under the nonprofit grant? Affects billing separation and who holds the credentials.
- [ ] **Budget approval route** — who signs off on recurring cloud spend once the grant is
      exhausted (roughly the ~10k-user point), and what notice do they need?
- [ ] **Do they want the app under JP branding/identity** (subdomain) or as a separate
      product identity (`veervrat.com`)? Partly an institutional-positioning question, not
      just technical.

---

## Next actions

1. Send the IT enquiry to JP *(drafted 2026-08-09)* — gates the provider decision.
2. Apply for Microsoft nonprofit verification (needs trust cert, PAN, 12A/80G).
3. Stand up the Render stopgap so beta testers are unblocked meanwhile.
4. Write the budget proposal once the grant answer lands.
5. Then: Terraform → CD workflow → DNS cutover. *(All five complete as of 2026-08-17. Resend replaced by JP SMTP relay — D9.)*

---

## Phase 2 build log — actual, vs the estimates above (2026-08-16)

### What is actually provisioned and what it costs

| Resource | Planned | Actual | Note |
|---|---|---|---|
| Postgres | Flexible Server B1ms, ~$13/mo | ✅ as planned, **v18** | matches the Neon source data — no version conversion at migration |
| Redis | "Azure Cache Basic C0", ~$16/mo | ⚠️ **Azure Managed Redis `Balanced_B0`, ~$12/mo** | the planned service was **retired by Azure mid-build**; replacement is cheaper |
| Container Registry | ACR Basic, ~$5/mo | ✅ as planned | flat rate, same-region pulls free |
| Log Analytics | not costed | ~$2–3/mo | required by Container Apps; small at this log volume |
| Storage alert | not costed | ~$0.10/mo | added after review — auto-grow trades outage risk for cost risk |
| Container Apps | consumption | **$0 while idle** | scale-to-zero (`min_replicas = 0`) on UAT |
| **UAT total** | ~$34/mo | **~$28/mo** | under estimate |

Prod (Phase 2B) roughly doubles the stateful cost, so expect **~$55–60/mo for both
environments** — still comfortably inside the ₹13,000/mo budget alert and the grant.

### Estimates that turned out wrong

1. **Azure Cache for Redis no longer exists for new deployments.** The `apply` failed with
   *"Azure Cache for Redis is retiring, create Azure Managed Redis instance instead."* Its
   own stated replacement resource in the Terraform provider
   (`azurerm_redis_enterprise_cluster`) is *also* deprecated and rejects the new SKU names.
   Verified the real pricing against Azure's live retail API (`prices.azure.com`) rather
   than the marketing pricing page, which renders `$-` placeholders.
   **Lesson: for a managed service, confirm the SKU still exists before budgeting it.**

2. **Scale-to-zero makes UAT compute genuinely free when idle**, which the original estimate
   treated as a fixed cost. The trade is cold-start latency on the first request — fine for
   UAT, revisit `min_replicas = 1` for prod once real users arrive.

### Cost risks now live

- **Postgres auto-grow is ON and storage never shrinks.** A runaway table permanently raises
  the floor. Guarded by a `storage_percent > 80%` alert to `om.chavan@jnanaprabodhini.org`.
- **ACR has no purge policy.** Automatic retention is **Premium-tier only**; on Basic the
  path is a scheduled `acr purge` task. Nothing to purge yet, but this is the one line item
  that grows unattended once CD pushes an image per merge. Basic includes 10 GB.
- Grant expires **2027-08-14** and does not roll over.


---

## Prod infra is live and metered — but idle (2026-08-16)

Phase 2B provisioned prod's stateful core, then work deliberately paused before the first
`prod-*` tag (for O7 + doc reorganisation). Consequence worth being explicit about:

**prod now costs roughly $28/mo serving zero users** — Postgres B1ms (~$13), Managed Redis
Balanced_B0 (~$12), Log Analytics (~$2-3), metric alert (~$0.10). Container Apps cost nothing
because no apps run in it.

Combined with UAT, **~$56/mo total**, against a grant worth ~$166/mo. Comfortable, and the
budget alert at ₹13,000/mo is far above it — but it is real spend on infrastructure we have
chosen not to use yet.

This should have been stated *before* applying, so that deferring Phase 2B until after O7 was
an available choice. Recording it as a habit to keep: **when provisioning ahead of need, say
what the meter costs and what the alternative was.**

If O7 concludes that prod is not needed soon, `terraform destroy` in `envs/prod` is safe
today — it holds no data. (At the time this was written, `envs/shared` also held a DNS zone,
called out here as the one genuinely unrecoverable resource. It was never used and was removed
2026-08-24, #80 — so `envs/shared` now holds nothing irreplaceable either.)

---

## ⚠️ Cost incident — 2026-09-02: Log Analytics ingestion spike (₹19,230)

**The single largest cost event in this project, consuming ~10% of the annual grant in 12
hours.** Recorded here as a real cost data point for the budget proposal (#84).

### What happened

BullMQ (the email queue, adopted 2026-08-31, #141) uses Lua scripts internally. Azure Managed
Redis runs in cluster mode even at the `Balanced_B0` tier. Without a hash tag prefix, BullMQ's
keys landed in different hash slots, and every queue operation failed with `CROSSSLOT Keys in
request don't hash to the same slot`. The errors were **logged, not thrown** — the queue
silently did nothing while generating 3.3 million log lines per hour.

### What it cost and why

| | |
|---|---|
| Log volume | ~53 GB/day ingested |
| Unit cost | ~₹363/GB (Azure Log Analytics, Central India) |
| Duration | ~12 hours (from deployment of #141's email queue to cost guard firing) |
| Total | **₹19,230** |
| Billing model | **per GB ingested** — the act of writing data costs money. Stored data does not accrue new charges |

### Why the protections failed

| Protection | Lag | What happened |
|---|---|---|
| Budget alert (50%/75%/100%) | 12–24 hours | fired **after** the money was spent |
| Cost guard webhook (#93) | 12–24 hours | fired at 09:51 UTC, ~12 hours after the spike began |
| `daily_quota_gb` | **zero** | **did not exist yet** — added in the same PR that fixed the root cause |

### What was added

1. **`daily_quota_gb = 2`** on both Log Analytics workspaces. Caps ingestion at 2 GB/day at the
   Log Analytics level with zero billing lag. Maximum daily cost: ~₹730. This is the structural
   guard the system was missing.
2. **BullMQ hash tag prefix** (`prefix: '{email}'`) — fixes the root cause.
3. **Worker error rate limiting** (1 line/min) — caps the blast radius of any future error loop.

### Budget impact

| | Before | After |
|---|---|---|
| Grant used | ~₹1,500 (normal running) | **~₹20,700** (~10.8% of ₹1,91,300) |
| Monthly runway | ~₹15,900/mo (₹1,91,300 ÷ 12) | ~₹14,900/mo (₹1,70,600 remaining ÷ ~11.5 months) |
| Normal monthly spend | ~₹5,600/mo | unchanged |
| Risk to runway | none | **none** — the incident is one-off, not recurring. Normal spend is still <40% of monthly runway |

### Lesson for the budget proposal

The ~$28/mo estimate is the **normal** cost. What this incident proves is that Log Analytics
ingestion can consume the entire monthly budget in hours if a logging loop occurs. The
`daily_quota_gb` guard means this specific failure mode is now capped at ~₹730/day, but any new
log-heavy failure (a new queue, a chatty dependency, a misconfigured diagnostic setting) could
produce a similar spike before the budget-level protections notice. The proposal should name
`daily_quota_gb` as a cost control, not just a monitoring setting.
