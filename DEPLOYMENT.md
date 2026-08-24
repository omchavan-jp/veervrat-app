# Deployment Runbook — Veervrat

The live runbook. **This must describe what is actually deployed**, not what we intend to
deploy. Update it in any infra PR.

Rules and conventions live in `AGENTS.md` (branching, tags, migrations) and
`documentation/21_Infrastructure-Conventions.md` (Terraform). This file is the *procedure*.

---

## Current state (2026-08-17)

**UAT is live** and running the runtime-config fix (`8039e67`). `/ready` green, schema
migrated and seeded. The `/api/v1` rewrite proxy is **gone** — the browser calls the api
directly on `api.uat.veervrat.jnanaprabodhini.org`. Verified there: the web tier advertises its
own api, `og:url` names the UAT domain, the OAuth `redirect_uri` is on the api origin, CORS
returns the web origin with credentials, cookies are `Secure; SameSite=Lax` host-scoped.

⚠️ **Nobody can log in to UAT yet** — no users exist, Google OAuth is a placeholder, and
credential login needs email that is not wired. So the browser-only checks (session persists,
CSRF passes across hosts) are still outstanding. See step 8 below and §18.

✅ **Prod is live and correctly wired** as of `prod-2026-08-17`. The defect that had prod's web
tier reading and writing **UAT's database** is fixed: prod now calls
`api.veervrat.jnanaprabodhini.org`, the old `/api/v1` proxy path returns 404, and `og:url` names
the prod domain. `/ready` green on both tiers.

Remaining gaps on prod, none of them blocking:

- **Google OAuth is still `placeholder-not-configured`** (O23). Credential signup works, so
  there is a login path, but Google sign-in fails.
- **Email from prod is configured but unproven.** The real SMTP password is in prod's Key Vault
  and the config matches UAT's working setup, but no message has actually been sent from prod —
  deliberately, because issue #75 means a test account created there cannot be deleted. Expect the
  first real signup to be the proof.

Neon migration is **cancelled** (D19) — prod will be created fresh and seeded, exactly as CD
already does for UAT. The dump at `../backups/veervrat-neon-20260809T184831Z.dump` is retained
as an archive, not a migration source.

| Piece | State |
|---|---|
| Azure subscription | `veervrat` · Central India · grant-funded (expires 2027-08-14) |
| Terraform | `infra/terraform/` — `envs/shared`, `envs/uat`, `envs/prod` all applied, plans clean |
| Container registry | `veervratacr.azurecr.io` — `veervrat-api`, `veervrat-api-migrate`, `veervrat-web` |
| CI/CD | `ci.yml` + `integration.yml` (PR gates) · `cd.yml` (build → migrate → deploy). GitHub→Azure via OIDC, no stored secrets |
| UAT Postgres | `veervrat-uat-psql` (v18, Burstable B1ms) — running, **schema migrated** (`pg_trgm` allow-listed via `azure.extensions`) |
| UAT Redis | `veervrat-uat-redis` (Azure Managed Redis, Balanced_B0) — running |
| UAT secrets | `veervrat-uat-kv` — `database-url`, `redis-url`, `session-secret`, `postgres-admin-password` |
| UAT data | ✅ **seeded** — 6 virtues, 35 weaknesses, 226 sentences, 82 exposures, 128 resolutions, 31 challenges |
| UAT compute | api + web Container Apps **running** in `veervrat-uat-cae`, scale-to-zero when idle |
| UAT web | https://uat.veervrat.jnanaprabodhini.org (custom domain, live 2026-08-17) — internal: https://veervrat-uat-web.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io |
| UAT api | https://api.uat.veervrat.jnanaprabodhini.org (custom domain, live 2026-08-17) — **called directly by the browser**; the rewrite proxy was removed 2026-08-17. Internal: https://veervrat-uat-api.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io |
| prod Postgres | `veervrat-prod-psql` (v18, Burstable B1ms) — running, 35-day backup retention, schema migrated |
| prod Redis | `veervrat-prod-redis` (Azure Managed Redis, Balanced_B0) — running |
| prod secrets | `veervrat-prod-kv` — `database-url`, `redis-url`, `session-secret`, `postgres-admin-password` |
| prod data | seeded (same content set as UAT) |
| prod compute | api + web Container Apps **running** in `veervrat-prod-cae` on the **pre-fix image `5576918`**, scale-to-zero (`min_replicas=0` — revisit once real traffic is expected) |
| prod web | https://veervrat.jnanaprabodhini.org (custom domain, live 2026-08-17) — internal: https://veervrat-prod-web.graydesert-a1bc836e.centralindia.azurecontainerapps.io |
| prod api | https://api.veervrat.jnanaprabodhini.org (custom domain, live 2026-08-17) — hostname bound and serving, but **prod's web still proxies to UAT** until a new tag ships the fix (O22). Internal: https://veervrat-prod-api.graydesert-a1bc836e.centralindia.azurecontainerapps.io |
| DNS | **live** — per-record (not delegation, see `ops/PROJECT-STATUS.md` D14/O1); both custom domains bound with managed TLS certs as of 2026-08-17 |
| Email | ✅ **delivering on UAT** — nodemailer over JP IT's relay (`dhoomketu.in:587`, STARTTLS), verified 2026-08-17 to an external inbox. ⚠️ **prod's Key Vault holds a placeholder password** — set `smtp-password` there before the next prod deploy, or prod silently logs mail to console |
| Object storage | **not provisioned** — app still uses the S3 API; needs an SDK swap first |
| Search (Meilisearch) | deferred |

---

## How code reaches each environment

See `AGENTS.md` → Git conventions for the rules. In short:

```
merge PR to main  →  build image tagged with git SHA  →  push to veervratacr
                  →  auto-deploy that image to UAT

tag prod-YYYY-MM-DD  →  deploy the SAME image to prod
```

**Promote, never rebuild.** The prod deploy ships the exact image UAT exercised.

**A merge only triggers a build+deploy if it touched an app-relevant path.** Doc-only merges
(`documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/`, any `*.md`) are skipped — added
2026-08-16 after a pure doc PR rebuilt and redeployed for nothing. `prod-*` tag pushes are
never filtered. Details and the reasoning for not making UAT tag-gated instead:
`documentation/21_Infrastructure-Conventions.md` §16.

Automated in `.github/workflows/cd.yml`. The prod gate is the **tag itself** — GitHub's
required-reviewers rule needs a paid plan on private repos, so there is no approval prompt.
Pushing a `prod-*` tag is the deliberate act.

Local development is `docker-compose` and is not a deploy target — no pipeline touches it.

---

## Standing up a NEW environment, from zero

The ordered sequence. Verified end-to-end twice — UAT (2026-08-16, by hand) and prod
(2026-08-16, Terraform). **Every arrow below is a step that broke at least once**, which is
why this is written as a sequence rather than a set of facts.

Read `documentation/21_Infrastructure-Conventions.md` §14 first — it lists the traps with
their guards. This section is the happy path; that one is why the path has this shape.

### 0. Prerequisites

- The environment name must be `uat` or `prod` (the module validates this — D10 allows no
  third deployed environment).
- `envs/shared` must already exist: it holds the container registry and the DNS zone, and the
  new environment's apps pull images from that registry.
- Azure CLI logged in to the `veervrat` subscription.
  ⚠️ **If `az` hangs with no output, check IPv6 before anything else** — see §14.

### 1. Infrastructure only — no apps, no image needed

```bash
cd infra/terraform/envs/<env>          # copy envs/prod/main.tf as the template
terraform init
terraform plan                          # read the summary line; expect ~23 to add, 0 to destroy
terraform apply
```

Creates the resource group, Key Vault, Postgres, Redis, Container Apps *environment*,
identities and alerting. **Deliberately no apps and no jobs** — `image_tag` is empty, so
`local.deploy` and `local.jobs` are both false.

Takes ~10 minutes; Redis alone is ~7.

**Decide these before applying — they are immutable after creation:**

| Setting | Why it cannot wait |
|---|---|
| `postgres_backup_retention_days` | changing it later **replaces the server** |
| Key Vault `soft_delete_retention_days` | Azure rejects the change outright once set |
| Postgres `zone` | assigned by Azure if unset, then shows as permanent drift |

Verify: `terraform plan` again → **No changes**.

### 2. Build and push images — all from ONE commit

CD does this automatically on merge to `main`. By hand:

```bash
SHA=$(git rev-parse --short HEAD)      # clean tree — the tag is a label you choose, nothing enforces it
az acr build --registry veervratacr --image "veervrat-api:$SHA" --file apps/api/Dockerfile .
az acr build --registry veervratacr --image "veervrat-api-migrate:$SHA" --target build --file apps/api/Dockerfile .
az acr build --registry veervratacr --image "veervrat-web:$SHA" --file apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=/api/v1 \
  --build-arg API_ORIGIN="https://veervrat-<env>-api.<default-domain>" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://veervrat-<env>-web.<default-domain>" \
  --build-arg NEXT_PUBLIC_FEEDBACK_MODE=test \
  --build-arg NEXT_PUBLIC_COMMIT_SHA="$SHA"
```

The `<default-domain>` is knowable **before the apps exist**:

```bash
az containerapp env show -n veervrat-<env>-cae -g veervrat-<env> \
  --query properties.defaultDomain -o tsv
```

**Then verify the tags actually exist** — Container Apps resolves the tag, not the build job:

```bash
for r in veervrat-api veervrat-api-migrate veervrat-web; do
  az acr repository show-tags --name veervratacr --repository "$r" -o tsv | grep -qx "$SHA" \
    && echo "ok $r" || echo "MISSING $r"
done
```

### 3. Create the jobs (still no apps)

```bash
terraform apply -var="image_tag=$SHA"
```

`image_tag` being non-empty creates the migrate and seed jobs. Apps stay absent because
`deploy_apps` defaults to false.

### 4. Migrate — before any app serves the new schema

```bash
az containerapp job start -n veervrat-<env>-migrate -g veervrat-<env>
az containerapp job execution list -n veervrat-<env>-migrate -g veervrat-<env> -o table
```

**Wait for `Succeeded`.** If it fails, read the logs and fix the cause — a failed Prisma
migration blocks every later one until a human resolves it (see the migrations section
below). Do not proceed to step 5 on a failed migration; the app would query columns that do
not exist.

### 5. Seed reference content

```bash
az containerapp job start -n veervrat-<env>-seed -g veervrat-<env>
```

Without this the environment is *serving* but not *usable* — no virtues, weaknesses or
sentences means no weakness test and no journeys. Verify from the job logs, which print row
counts per table (expect 6 virtues / 35 weaknesses / 226 sentences at time of writing).

### 6. Deploy the apps

```bash
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true"
```

### 7. Verify — the check that actually proves it

```bash
API=$(az containerapp show -n veervrat-<env>-api -g veervrat-<env> \
  --query properties.configuration.ingress.fqdn -o tsv)

curl -s "https://$API/ready"     # {"status":"ok","checks":{"database":"up","redis":"up"}}
curl -s "https://$API/api/v1/auth/check-username?username=probe"   # proves the schema landed
```

A green `/ready` means images, Key Vault secrets via managed identity, networking **and**
schema are all correct together. `/health` only proves the process started — it is not the
check that matters. First request after idle may be slow: `min_replicas = 0` means a cold
start.

**`/ready` is not sufficient on its own.** It checks each service in isolation and cannot tell
you whether the tiers are wired to *this* environment's peers — prod ran for a day with a green
`/ready` while its web tier talked to UAT's database. Also confirm:

```bash
WEB=$(az containerapp show -n veervrat-<env>-web -g veervrat-<env> \
  --query properties.configuration.ingress.fqdn -o tsv)

# The served HTML carries the api URL the browser will use — it must be THIS environment's api
curl -s "https://$WEB/login" | grep -o 'api[a-z.\-]*veervrat[a-z.\-]*'
```

CD runs this automatically (`.github/actions/deploy-environment`), but do it by hand for an
environment stood up outside the pipeline.

### 8. Confirm somebody can actually log in

**An environment is not finished until a human can sign in.** Easy to miss: `/ready` is
green, wiring is correct, content is seeded — and the environment is still unusable, because
health checks cannot see that there is no way in.

A freshly provisioned environment has **no users at all** — the seed loads content only. So
one of these must be true before the environment counts as done:

- Email is wired, so credential signup can complete verification (login refuses an unverified
  address), **or**
- Real Google OAuth credentials are in place — the Terraform default is
  `placeholder-not-configured`, which fails before reaching Google.

Neither was true for UAT or prod as of 2026-08-17, which is also why any change
to cookies, CORS, CSRF or sessions cannot be verified yet: those need a real browser session.
See `documentation/21_Infrastructure-Conventions.md` §18.

### 9. Record it

Update this file's *Current state* table and `ops/azure-account-facts.md` §5. The facts
file is the source of truth for what exists; if it disagrees with reality, reality is a bug
in the file.

---

## Database migrations — manual, never automatic

Per the hard rule in `AGENTS.md`: migrations are never applied automatically to a deployed
environment. A bad migration against real user data is expensive to undo.

**They run as a one-off Container Apps Job inside Azure**, using the same image as the app.
Two reasons this is not done from a laptop:

1. Azure Postgres accepts connections from Azure services only. A local `prisma migrate
   deploy` is refused by the firewall. (Punching a temporary hole for your IP works, but
   leaves a security exception to remember to close.)
2. Running from a laptop risks a different Prisma version than the one in the image that
   will actually serve traffic.

**Order matters and is not negotiable:**

```
1. build + push image (tagged with the git SHA)
2. run the migration job on that image
3. deploy the app on that same image
```

Reversed, the app boots and queries columns that don't exist yet.

Migrations are **forward-only**. A bad migration is corrected with a new migration —
never `migrate reset` against a deployed database.

### Procedure

The job is defined in `infra/terraform/modules/environment/migration-job.tf` as
`veervrat-<env>-migrate`. It runs the **build**-stage image
(`veervrat-api-migrate:<sha>`) — *not* the runtime image, because `prisma` is a
devDependency and is pruned out of runtime, which ships the migration files but not the
tool that applies them.

**CD does this automatically** (`.github/actions/deploy-environment`). To run it by hand —
recovering a failed migration, or a one-off:

```bash
ENV=uat   # or prod
SHA=<git sha of an image already in the registry>

# Move the JOB (not the apps) to the new image, then run it. The apps stay on the old image
# because app_image_tag holds them there — that is what enforces migrate-before-deploy.
#
# ⚠️ Never pass --image to `job start`. It does not override just the image: it replaces the
# whole container spec, dropping command, args and env. The execution then runs the image's
# default entrypoint with no DATABASE_URL, migrates nothing, and exits 0 — reported as
# Succeeded. Prod ran three such "successful" migrations against an empty database.
cd infra/terraform/envs/$ENV
terraform apply -var="image_tag=$SHA" -var="app_image_tag=$CURRENT_SHA" -var="deploy_apps=true"
az containerapp job start -n veervrat-$ENV-migrate -g veervrat-$ENV

az containerapp job execution list -n veervrat-$ENV-migrate -g veervrat-$ENV -o table
# Job logs: the replica is reaped quickly, so `logs show` usually misses them. Log Analytics
# is the reliable source — note ContainerAppName_s is EMPTY for jobs, so filter on the
# container name, and allow ~2 min for ingestion.
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(30m) | where ContainerName_s == 'migrate' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table

# Expect "N migrations found in prisma/migrations". No output at all means the container ran
# without its command — the migration did NOT happen, whatever the status says.

# Only once migrations succeed:
cd infra/terraform/envs/$ENV
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true"
```

**Recovering a failed migration.** Prisma records the failure (`P3018`) and refuses every
later `deploy` until a human states whether it rolled back — deliberately not automatic,
which is also why the job has `replica_retry_limit = 0`:

```bash
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true" \
  -var='migrate_command=migrate resolve --rolled-back <migration_name>'
az containerapp job start -n veervrat-$ENV-migrate -g veervrat-$ENV
# then re-apply with the default migrate_command and run the job again
```

`prisma migrate deploy` applies committed migrations only — it never generates one and
never resets. `replica_retry_limit = 0` is deliberate: re-running a partially-applied
migration should be a human decision, not an automatic retry.

---

## Seeding reference data — a separate job, deliberately not a migration

The app is unusable without reference content: virtues, subvirtues, weaknesses, sentences,
challenges, resolutions, exposures. You cannot take a weakness test or start a journey
against an empty database, so a freshly-migrated environment is *serving* but not *usable*.

**Seed is not part of migrations, on purpose:**

- Migrations are **schema**, one-shot and forward-only. Seed is **content**, idempotent
  (`src/database/seed.ts` uses upserts) and re-runnable.
- Put seeding in a migration and it can never be re-run — and every content correction (a new
  virtue, fixed Marathi wording) would need a fresh migration, which cannot be edited once
  applied anywhere.
- Content changes on a product cadence and gets product review; schema changes on an
  engineering cadence. Different lifecycles should not share a mechanism.

It reuses the **same one-off job machinery as migrations** — same build-stage image (it needs
`ts-node`, which like the `prisma` CLI is a devDependency pruned out of runtime), same managed
identity, same manual trigger. Only the command differs:

```bash
# Seed has its OWN job (seed-job.tf) with the command and DATABASE_URL already wired, so it
# is started with no overrides — same rule as migrate. Overridden executions also produce no
# retrievable logs, so you would not be able to tell whether it worked. See §21.
az containerapp job start -n veervrat-$ENV-seed -g veervrat-$ENV

# Verify by its output, not its exit code:
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(30m) | where ContainerName_s == 'seed' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table
# Expect "Seed complete:" followed by per-table counts.
```

Per **O11**, UAT holds seeded reference data and **never real users**. Prod gets the same
reference seed plus the migrated beta data from the Neon dump.

---

## Environment variables

Runtime secrets come from the environment's Key Vault (`veervrat-<env>-kv`) via managed
identity — never pasted into the portal, never committed.

### api

| Var | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Key Vault `database-url` | generated by Terraform |
| `REDIS_URL` | Key Vault `redis-url` | generated by Terraform |
| `SESSION_SECRET` | Key Vault | 32+ random chars |
| `NODE_ENV` | `production` | |
| `PORT` | `3001` | |
| `FRONTEND_URL` | the web app's URL | CORS + cookie origin |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Key Vault | ⚠️ **required at boot** — read via `getOrThrow` and *not* in the Joi schema, so a missing value crash-loops the api with no friendly error |
| `GOOGLE_CALLBACK_URL` | must match the Google console exactly | ⚠️ also required at boot |
| `DATABASE_POOL_MAX` | default 10 | ⚠️ the real limit is `POOL_MAX × maxReplicas + headroom ≤ server max_connections`. Burstable Postgres allows few connections; exhausting them fails every request at once, health probes included. |
| `SHUTDOWN_TIMEOUT_MS` | default 10000 | must stay under the platform's SIGTERM→SIGKILL grace period |
| `S3_*` | unset for now | uploads degrade gracefully — chat image upload is disabled, nothing else breaks |
| `MEILI_*` | unset | search deferred |

### web — **runtime**, except the commit SHA

Rewritten 2026-08-17. These used to be build-time `NEXT_PUBLIC_*`, which broke under
"promote, never rebuild": one image carried UAT's values into prod, and prod's web tier
called UAT's api. See `documentation/21_Infrastructure-Conventions.md` §17.

Runtime — set on the Container App, changed with a restart, no rebuild:

| Var | Notes |
|---|---|
| `API_BASE_URL` | absolute api URL incl. `/api/v1`. The browser calls the api directly — there is no proxy |
| `SITE_URL` | og:image / canonical URL base |
| `FEEDBACK_MODE` | `test` = list + form, `public` = form only, `off`/unset = hidden. Environment-level only; per-user is issue #40 |

Build-time, and only these:

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_COMMIT_SHA` | build id attached to feedback reports — describes the *image*, so baking is correct |
| `NEXT_PUBLIC_CONTENT_EDIT` | deliberately build-time: being inlined lets the bundler drop the editor's code so dev tooling never ships to users. Never passed by CD |

**The test before adding anything here:** does the value describe the *image*, or the
*environment the image runs in*? Only the former may be baked.

---

## Architectural gotchas that survived the move off Railway

These bit us before and will bite again if forgotten.

**Same-origin proxy and cookies.** On Railway, web and api sat on separate
`up.railway.app` subdomains — a public-suffix domain — so browsers treated the api's
session cookie as third-party and blocked it. The workaround was a Next.js rewrite proxying
`/api/v1/*` plus `SameSite=None`.

On a **shared custom domain** (`veervrat.jnanaprabodhini.org` + `api.veervrat.…`) this
whole problem disappears: set `COOKIE_SAMESITE=lax` and drop the proxy. Prefer that.

**WebSocket chat needs the custom domain.** Next.js rewrites do not proxy WebSocket
upgrades, so chat was broken on Railway. Two independent causes existed — that, and the
missing Socket.IO Redis adapter. **The adapter is now fixed** (multi-instance-readiness);
the transport half is resolved by putting web and api on the same real domain, which is
blocked on the pending NS delegation.

**OAuth callback chicken-and-egg.** `GOOGLE_CALLBACK_URL` must exactly match the Google
console entry, and it should point at whichever origin makes the `Set-Cookie` first-party.

---

## External dependencies — what we do NOT run

Two pieces of the production stack are **not ours**, are **not on Azure**, and are **not in
Terraform**. Anyone deploying, migrating, or costing this system needs them stated plainly,
because none of it is discoverable from the code.

### DNS — managed by JP IT

`veervrat.jnanaprabodhini.org` is a **subdomain of Jnana Prabodhini's existing domain**, and the
records are added by **JP IT (Shantanoo Mahajan)** on their nameservers, per-record.

- We do **not** control the zone. Adding or changing a hostname is a **request to a person**, not
  a `terraform apply`. Plan for human turnaround.
- Four records are live: `veervrat`, `uat.veervrat`, `api.veervrat`, `api.uat.veervrat`.
- An Azure DNS zone exists from the abandoned NS-delegation plan and is **unused** — see #80.
- ⚠️ The hostname must also be **bound to the Container App** on our side, and a managed
  certificate issued. DNS being live is not the same as the site working — that gap produced a
  404 on the real domain once, which looked like JP IT's problem and was ours.

**Cost: nil.** We use an existing domain. A standalone domain would be a new annual cost, and a
new thing to own.

### Email — JP IT's SMTP relay

Outbound mail goes through **JP IT's relay** (`dhoomketu.in:587`, STARTTLS), sending as
`do-not-reply-veervrat@notifications.jnanaprabodhini.org` — a dedicated *notifications*
subdomain, deliberately not staff mail, which is what resolved the sender-reputation concern
behind **D9**.

- Credentials are issued by JP IT and live in each environment's Key Vault (`smtp-password`),
  set **out of band** — Terraform creates the secret with a placeholder.
- ⚠️ `SMTP_SECURE=false` is correct: port 587 upgrades via STARTTLS. `true` means implicit TLS on
  465 and fails with an error that does not name the cause.
- Replaced Resend (D9), removing an external account and its 3,000/month ceiling.

**Cost: nil**, and no per-message ceiling.

### Why this matters beyond deployment

Both are **portability assets**. Neither depends on Azure, so both survive a move to any other
host untouched — email and DNS are simply not part of a cloud migration.

Both are also **organisational dependencies**: they rely on JP IT's goodwill and on one named
person's availability. That belongs in the risk register alongside the technical ones. If the
relationship or the person changes, the replacement costs are a paid mail service (~$10–20/month
at this volume) and a domain (~$10–15/year) — small, but not zero, and they would need owners.

---

## DNS cutover checklist

Runs once, when JP's NS delegation lands (O1). Several of these are easy to forget because
they're only *implied* by the gotchas above — hence the explicit list.

- [ ] Confirm delegation propagated: `dig NS veervrat.jnanaprabodhini.org` returns the four
      `azure-dns` nameservers from `azure-account-facts.md` §5.
- [ ] Add the app's DNS records **in Terraform**, inside the existing zone — never
      re-create the zone (see `21_Infrastructure-Conventions.md` §4).
- [ ] Bind custom domains + managed TLS certs to the Container Apps.
- [ ] **Set `COOKIE_SAMESITE=lax`** — the `SameSite=None` workaround exists only because
      web and api were on different public-suffix domains. On a shared domain it's
      unnecessary and weaker.
- [ ] **Remove the Next.js `/api/v1/*` rewrite proxy.** It exists for the same reason and
      is what breaks WebSockets.
- [ ] Rebuild web with the new `NEXT_PUBLIC_API_URL`, `API_ORIGIN`, `NEXT_PUBLIC_SITE_URL`
      — these are **build-time**, so a restart is not enough.
- [ ] Update `GOOGLE_CALLBACK_URL` **and** the matching entry in the Google console.
- [ ] Verify chat actually works — this is the payoff; both causes (transport + Redis
      adapter) are only now resolved.
- [ ] **Rotate the exposed secrets (O12):** GitHub PAT, `SESSION_SECRET`, R2 keys — all
      sat in plaintext in `apps/api/.env.railway`.
- [x] Wire email: `email.service.ts` now speaks SMTP (shipped 2026-08-17). **No DNS work needed** — D9 moved
      sending to JP IT's relay, so JP owns SPF/DKIM/DMARC on
      `notifications.jnanaprabodhini.org` and we add no mail records at all.
- [ ] Point beta testers at the new URL.

---

---

## Bootstrapping the first admin

The admin dashboard is gated on the `ADMIN` role. Signup assigns `VRATARTHI`, the seed creates
no users, and changing roles requires an endpoint that already needs `ADMIN` — so a fresh
environment has a complete admin surface that nobody can open. The `grant-admin` job is the way
in.

**It matches on an existing account**, so that person must sign up in this environment first.

```bash
ENV=uat   # prove it here before prod

cd infra/terraform/envs/$ENV
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true" \
  -var='bootstrap_admin_email=someone@jnanaprabodhini.org'

az containerapp job start -n veervrat-$ENV-grant-admin -g veervrat-$ENV
```

Verify by its **output**, never its exit code (§21 — a job that reports Succeeded having done
nothing is the failure this project has already shipped once):

```bash
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(30m) | where ContainerName_s == 'grant-admin' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table
```

Expected:

```
granting ADMIN to someone@jnanaprabodhini.org (a1b2...)
roles: [VRATARTHI] -> [VRATARTHI, ADMIN]
audit event recorded: admin.role.bootstrap_granted
```

**Then reset the variable**, so the standing default targets nobody:

```bash
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true"
```

**Unverified addresses are refused.** Admin is effectively superadmin — any admin can add or
remove `ADMIN` on anyone — so handing it to an address nobody has proven they own is not a
default worth having. Override deliberately, and only for recovery (no admins left, mail
delivery broken):

```bash
terraform apply ... -var='bootstrap_admin_allow_unverified=true'
```

The override is recorded in the audit row's `emailVerified: false`, so it is visible later
rather than living in someone's memory.

**Other outcomes:**

| Output | Meaning |
|---|---|
| `nothing to do` | no email configured — the job is safe to start unconfigured |
| `No user with email ...` (exit 1) | typo, or that account has not signed up here yet |
| `already an admin — no change` | idempotent; no audit row is written for a non-grant |

**Keep the job after use.** The day admin access is lost — and the self-lockout guard is
per-person, so reaching zero admins is possible — this is the only way back in. Idle Container
Apps jobs cost nothing.

---

## Wiping an environment's users

⚠️ **The most destructive operation in this repository.** It removes every account and
everything belonging to one. There is no undo short of a database restore (~10 minutes, and it
restores to a *new* server — see the restore runbook below).

**What it is for:** resetting a pre-launch environment — clearing test accounts before handing
UAT to real testers, or clearing the accounts created while proving prod works. Nothing else.

**What it is not for:** removing one person's data. That is the account-deletion flow, which
*anonymises* rather than deletes, because most of the 23 relations pointing at a user are
`Restrict` — deleting a single row is not something the schema permits. This job sidesteps that
with `TRUNCATE ... CASCADE`, which is only defensible when the answer is "all of them".

### What survives

The truncation closure is `users` plus the 31 tables that reference it, directly or
transitively. **`cms_pages` is not in it** — `updated_by_id` carries no foreign key — so the
terms and privacy documents survive, as does every seeded reference row (virtues, and the rest
of the catalogue). After a wipe the environment is a working, content-complete install with no
accounts, not an empty database.

### Three guards

| Guard | What it stops |
|---|---|
| `wipe_users_confirm` defaults to `""` | the job exists but targets nothing; starting it unconfigured prints `nothing to do` |
| the confirmation must **name the environment** | a value left set in one environment's config, or carried into another by a copied file, does nothing where it lands |
| refuses above **50 accounts** | a real user base is not a disposable dataset; past that number the answer is no |

The second guard is why the variable is a string and not a boolean. `true` means the same thing
everywhere it appears; `uat` does not.

### Running it

```bash
ENV=uat   # prove it here before prod

cd infra/terraform/envs/$ENV
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true" \
  -var="wipe_users_confirm=$ENV"

az containerapp job start -n veervrat-$ENV-wipe-users -g veervrat-$ENV
```

Verify by its **output**, never its exit code (§21):

```bash
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(30m) | where ContainerName_s == 'wipe-users' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table
```

Expected:

```
Removing 6 account(s) and all data belonging to them, in uat.
Done. 0 accounts remain.
```

**Then reset the variable in the same sitting** — a standing armed confirmation is the whole
risk this design exists to avoid:

```bash
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true"
```

### Other outcomes

| Output | Meaning |
|---|---|
| `WIPE_USERS_CONFIRM is not set — nothing to do.` | unconfigured; safe |
| `Refusing: ... is "uat" but this environment is "prod"` | the confirmation names somewhere else — the guard working |
| `Refusing: N accounts exist, which is more than 50` | past the disposable-data threshold |
| `No users to remove.` | already empty; idempotent |
| `accounts remain` (exit 1) | the truncation did not take — investigate before retrying |

**Remove this job once the environment has real users.** Guard 3 will refuse on its own, but a
loaded mechanism with no legitimate remaining use is not something to leave lying in the
infrastructure.

---

## The scheduled cleanup job

`veervrat-<env>-cleanup-expired` runs nightly at **20:30 UTC (02:00 IST)** and deletes rows that
have expired and serve no further purpose: sessions, verification tokens and pending signups.

It is the only job here on a schedule rather than a manual trigger, and the only one with no
confirmation guard — every row it touches is already unusable, so running it twice or during live
traffic changes nothing anyone could have used. `invitations` is deliberately excluded despite
having `expires_at`: an expired invitation is a record a user can still see explained.

**Nothing alerts if it stops running.** Until #79 lands, the check is manual — read its last
execution:

```bash
ENV=uat
az containerapp job execution list -n veervrat-$ENV-cleanup-expired -g veervrat-$ENV \
  --query "[0].{name:name,status:properties.status,started:properties.startTime}" -o table
```

Then its output, which reports what it removed:

```bash
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(2d) | where ContainerName_s == 'cleanup-expired' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table
```

```
Cleanup complete:
  sessions: 128
  verification_tokens: 14
  pending_signups: 3
```

Zeros across several consecutive nights on an environment in real use is the signal worth
noticing — it means the job is running but matching nothing, which is more likely a broken query
than a genuinely clean database.

---

## Publishing a new version of the policy documents

Raising a document's version is what **re-prompts every user for consent**. It is a deliberate
act, not part of a deploy — which is why this is a manually-triggered job and why CD never runs
it.

⚠️ **Never publish a version bump before the consent re-prompt is deployed.** Both documents
promise, in English and Marathi, that a material change means being asked to accept the new
version. Publishing without a working prompt breaks that promise inside the document being
published.

**The rule the job applies**, per document:

| Database vs image | What happens |
|---|---|
| image version **higher** | published, text and title in both languages replaced |
| **equal** | left alone — this preserves an edit an administrator made through the admin panel without raising the version |
| database **higher** | **refused**, exit 1 — an older image is deployed, and publishing would roll the live policy backwards |

```bash
ENV=uat   # prove it here first

az containerapp job start -n veervrat-$ENV-publish-policies -g veervrat-$ENV
```

Verify by its **output**, never its exit code (§21):

```bash
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(30m) | where ContainerName_s == 'publish-policies' | project TimeGenerated, Log_s | order by TimeGenerated asc" -o table
```

```
terms: published v1 -> v2
privacy: published v1 -> v2

2 document(s) published. Every user whose recorded consent is now behind will be asked to
accept again on their next visit.
```

**Then check the documents actually changed**, in both languages — an English-only publish is
worse than none, because half the readers would be shown one policy and consented to another:

```bash
B=https://api.$ENV.veervrat.jnanaprabodhini.org/api/v1   # prod: https://api.veervrat.jnanaprabodhini.org/api/v1
for K in terms privacy; do curl -s "$B/cms-pages/$K" | python3 -m json.tool | head -5; done
```

**Then confirm the prompt appears.** Sign in as a user who accepted the previous version; the
consent dialog should block the app until accepted, and not reappear afterwards. If it does not
appear, the version bumped and nobody was asked — the exact failure this ordering exists to
prevent.

---

## Setting a secret out of band — a restart is not enough

Several secrets are created by Terraform with a placeholder and their real value set afterwards:
`smtp-password`, `google-client-secret`, `sentry-dsn`. Setting the value in Key Vault is only
half the job.

**Container Apps caches Key Vault secret references.** Restarting a revision reuses the cached
value; only a **new revision** re-resolves it. (It also refreshes on its own roughly every 30
minutes, which is worse than it sounds — it means a change appears to have failed, and then
silently starts working later, so whoever tested it concluded the wrong thing.)

Observed on 2026-08-23: the DSN was set, the revision restarted, `/ready` returned 200, and the
app still logged `Error tracking DISABLED … placeholder-set-out-of-b`. Nothing was broken; the
container simply never saw the new value.

```bash
ENV=uat
NAME=veervrat-$ENV-api

# 1. Set the value from a file, so it never appears in shell history or the process list.
az keyvault secret set --vault-name veervrat-$ENV-kv --name sentry-dsn \
  --file ~/.secrets/veervrat/sentry-dsn-$ENV --encoding utf-8 -o none

# 2. Force a NEW revision. `revision restart` does not do this, and `revision copy` with no
#    changes is a no-op in Single revision mode.
az containerapp update -n $NAME -g veervrat-$ENV --revision-suffix sec$(date +%H%M) -o none
```

**Then verify by the app's own output, never by the configuration looking right:**

```bash
WS=$(az monitor log-analytics workspace show -g veervrat-$ENV -n veervrat-$ENV-logs --query customerId -o tsv)
az monitor log-analytics query -w "$WS" --analytics-query \
  "ContainerAppConsoleLogs_CL | where TimeGenerated > ago(15m) | where ContainerName_s == 'api' | where Log_s contains 'Error tracking' | project TimeGenerated, Log_s | order by TimeGenerated desc | take 2" -o table
```

`Error tracking enabled for "uat" at release <sha>` means it took. `DISABLED` means the revision
is still on the old value — repeat step 2.

⚠️ **Check nothing was dropped.** `az containerapp update` patches rather than replaces for
*apps*, unlike jobs (§21), but confirm rather than assume — compare the env-var count, image and
secret count before and after:

```bash
az containerapp show -n $NAME -g veervrat-$ENV \
  --query "{envs:length(properties.template.containers[0].env),image:properties.template.containers[0].image,secrets:length(properties.configuration.secrets)}" -o table
```

**The suffix is not tracked by Terraform** (`revision_mode = "Single"`, no `revision_suffix`), so
this creates no drift — the next CD deploy makes its own revision and re-resolves secrets anyway.
Which is the other way to do this: push any commit and let CD do it.

---

## Verifying rate limiting actually works

**Do this after any change to `trust_proxy_hops`, and once per environment after a platform
move.** Rate limiting is the one control in this system that fails completely silently: every
unit test passes, CI is green, the config looks right, and nothing is enforced. That is not
hypothetical — it was the state of both UAT and prod until #161, where seven requests against a
five-per-hour limit were all accepted.

**A passing test suite is not evidence here.** The defect was that the setting was never applied
to the running app, which no unit test can see. Only a measurement against a deployed
environment counts.

```bash
B=https://api.uat.veervrat.jnanaprabodhini.org/api/v1
C=probe-$RANDOM

# forgot-password is limited to 5/hour per client. The 6th must be refused.
for i in $(seq 1 6); do
  curl -s -X POST "$B/auth/forgot-password" -H 'Content-Type: application/json' \
    -H "Cookie: csrf-token=$C" -H "X-CSRF-Token: $C" \
    -d '{"email":"nobody-probe@example.com"}' | head -c 80; echo
done
```

Expected — the first five accepted, the sixth refused:

```
{"data":{"status":"sent"}}          ×5
{"statusCode":429,"error":"RATE_LIMITED","message":"Too many requests. Try again in ... seconds."}
```

`"status":"sent"` six times means **throttling is off**, whatever the configuration says. The
address is deliberately one that does not exist: the endpoint answers identically either way, so
no mail is sent.

### Confirming it keys on the client and not the proxy

The check above proves counting works. It does **not** prove the counter is per-client — if
`req.ip` were the ingress address, every caller on the internet would share one bucket and the
sixth request would still be refused. Distinguish them one of two ways:

- **From a second network** (a phone off wifi): one request must be accepted while the first
  client is still blocked.
- **From the audit log**: sign in as an admin and open a recent `auth.login_failure` row. Its
  `ipAddress` should be your real public address (`curl https://api.ipify.org`), not a `10.x`
  or `100.x` internal one. An internal address means `trust_proxy_hops` is too low.

If a client's own `X-Forwarded-For` changes which bucket it lands in, the value is too **high** —
the client is choosing its own key, which is worse than no limiting at all. Lower it.

---

## Verifying a deploy

```bash
curl https://<api-url>/health   # cheap liveness — process is up
curl https://<api-url>/ready    # actually pings Postgres + Redis
```

A green `/ready` means env vars, secrets and networking are all correct — it is the check
that matters. Then: sign up / log in through the web UI and confirm the session cookie is
set and a dashboard loads.

---

## Restoring the database from backup — rehearsed, not theoretical

**Rehearsed on UAT 2026-08-21** (#89). Before that date "we have backups" was a configuration
setting, not a demonstrated recovery. Never rehearse on prod.

⚠️ **Scope: this covers provider-managed backups only.** Those live inside the same Azure
subscription and the same region as the database they protect, and geo-redundant backup is
disabled in both environments. They therefore protect against **deletion, corruption and
operator error** — not against losing the region, and not against losing the subscription
itself. There is currently **no copy of the data outside Azure**, so this procedure is not a
complete answer to "what if we lose the account". Tracked separately.

### The number that matters

**9 minutes 1 second** from command to a `Ready` server (19:03:00 → 19:12:01 UTC), B1ms / 32GB.
Deletion afterwards took 1m19s. Plan a recovery around ~10 minutes for the restore itself, plus
whatever re-pointing the app needs.

### ⚠️ You cannot restore in place

Flexible Server always restores to a **new server**. There is no "roll this one back". So a real
recovery is:

1. restore to a new server (~9 min)
2. verify it
3. **re-point the app at it** — the connection string lives in Key Vault (`database-url`), so this
   is a secret update plus a revision restart, not a Terraform change
4. decide what happens to the old server — and to Terraform state, which still references it

Step 4 is the one people meet at the worst moment. `prevent_destroy` is set on the Postgres
resource, so Terraform will not remove the old server for you.

### Doing it

```bash
ENV=uat   # never prod
RESTORE_TIME=$(python3 -c "import datetime;print((datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(minutes=12)).strftime('%Y-%m-%dT%H:%M:%SZ'))")

# Check the window first — PITR only reaches back backupRetentionDays.
az postgres flexible-server show -n veervrat-$ENV-psql -g veervrat-$ENV \
  --query "{retentionDays:backup.backupRetentionDays,earliest:backup.earliestRestoreDate}"

az postgres flexible-server restore \
  --name veervrat-$ENV-psql-rehearsal \
  --source-server veervrat-$ENV-psql \
  --restore-time "$RESTORE_TIME" \
  -g veervrat-$ENV --no-wait

until [ "$(az postgres flexible-server show -n veervrat-$ENV-psql-rehearsal -g veervrat-$ENV --query state -o tsv)" = "Ready" ]; do sleep 30; done
```

### Verifying it — connecting is the fiddly part

Postgres admits **Azure services only**, so a laptop cannot reach the restored server until you
say so. Add a rule **on the restored server only**, never the live one:

```bash
MYIP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create -g veervrat-$ENV \
  -s veervrat-$ENV-psql-rehearsal -n rehearsal-verify \
  --start-ip-address $MYIP --end-ip-address $MYIP
```

⚠️ The server is `-s/--server-name` here and `-n/--name` is the *rule*. Passing `-n` for the
server fails with an "unrecognized arguments" error that is easy to skim past as success — it
was, once. Confirm with `firewall-rule list` rather than trusting the create.

⚠️ `az postgres flexible-server execute` needs the `rdbms-connect` extension, whose `psycopg2`
fails on macOS with a missing `libpq`. Use a container instead — no local install, works anywhere:

```bash
PW=$(az keyvault secret show --vault-name veervrat-$ENV-kv --name postgres-admin-password --query value -o tsv)
docker run --rm -e PGPASSWORD="$PW" --platform linux/amd64 postgres:18-alpine \
  psql -h veervrat-$ENV-psql-rehearsal.postgres.database.azure.com -U veervrat_admin -d veervrat \
  -c "select count(*) from users;"
```

### What "verified" should mean

Row counts alone are weak — they look right in a stale snapshot too. Check that the restored
database is **internally consistent with its own history**:

- reference content matches the seed job's output (6 virtues, 33 subvirtues, 35 weaknesses,
  226 sentences, 128 resolutions, 82 exposures, 31 challenges)
- `_prisma_migrations` contains the **most recent** migration — proof that schema changes are
  captured, not just data
- state matches the audit log. In the rehearsal, `user_capabilities` held exactly one grant, and
  `audit_events` explained precisely why: every other grant had a matching revoke.

That last check is what distinguishes a real restore from a plausible-looking one.

### Clean up — part of the exercise, not an afterthought

```bash
az postgres flexible-server delete -n veervrat-$ENV-psql-rehearsal -g veervrat-$ENV --yes
```

The rehearsal server bills while it exists (~₹35/day at B1ms). Deleting it also removes its
firewall rule. Confirm the **live** server is still `Ready` afterwards.

### Retention, as configured

| | UAT | Prod |
|---|---|---|
| Backup retention | 7 days | **35 days** — the Flexible Server maximum, set at creation because it is immutable afterwards |
| Geo-redundant | Disabled | Disabled |

⚠️ Geo-redundancy is off in both. A regional failure in Central India is not covered by this
procedure. That is a deliberate beta trade-off, not an oversight — but it should be a stated one.

---

## Rollback

Deploy the previous `prod-*` tag's image. Because prod ships a promoted image rather than
a rebuild, the previous release is a known-good artifact still sitting in the registry.

Database migrations are forward-only and are **not** rolled back — correct them with a new
migration.

---

## Known gaps

| Gap | Blocked on |
|---|---|
| App not deployed anywhere | first image push + migration job (next step) |
| Custom domain, HTTPS, working chat | NS delegation from JP (O1) — external |
| Email (verification, password reset) doesn't deliver | check `SMTP_HOST` is set on the api — without it the service silently logs to console instead of sending |
| Object storage | app uses the S3 API; Azure Blob doesn't speak it — needs `@azure/storage-blob` swap |
| Beta data still in Neon | migration after prod exists |
| Search | Meilisearch deferred |
| prod environment | Phase 2B Terraform |

---

## Content-editing deployment (dev-only)

A separate, access-restricted deployment lets a content editor edit UI copy (en/mr)
in-context and publish changes as a PR. **Off everywhere by default — never enable it on
production.** Design: archived openspec change `in-context-content-editor`.

Requires, on top of the normal vars:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_CONTENT_EDIT` (web) | `on` — build-time; mounts the editor + i18n overlay |
| `CONTENT_EDIT_ENABLED` (api) | `true` — master gate; routes 404 when false |
| `ENVIRONMENT` | `local` \| `uat` \| `prod`. Named explicitly — `NODE_ENV` is `production` on UAT too. `content.edit` is refused outright when this is `prod` (O7) |
| `FEEDBACK_MODE` | `off` \| `all` \| `granted`. ⚠️ Must be set on the **api** as well as the web tier, or the widget is hidden rather than denied |
| `CONTENT_EDIT_GITHUB_TOKEN` | fine-grained PAT, this repo only, Contents + PR write |
| `CONTENT_EDIT_GITHUB_REPO` | `omchavan-jp/veervrat-app` — confirm against `gh repo view` before setting; the repo has moved owners once already (2026-08-24) and a move to `jnanaprabodhini` is planned (#132) |
| `CONTENT_EDIT_GITHUB_BASE_BRANCH` | `main` |

Overrides stage in object storage under `content-overrides/`. **Still genuinely blocked, not
just historically** — `content-overrides.repository.ts` constructs its own `S3Client` directly
(`@aws-sdk/client-s3`), independent of `uploads.service.ts`. #139 (2026-08-24) built a
`StorageProvider` seam and an Azure Blob implementation for the *uploads* path specifically;
`content-overrides` was not part of that change and still speaks S3 only. Confirm this by
searching for `@aws-sdk` under `content-overrides/` before assuming otherwise — this note will
go stale exactly the way the original one did if content-overrides is migrated later without
updating it here. Which environment content-editing runs in is still open (O7).
