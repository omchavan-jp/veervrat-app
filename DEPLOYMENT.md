# Deployment Runbook — Veervrat

The live runbook. **This must describe what is actually deployed**, not what we intend to
deploy. Update it in any infra PR.

Rules and conventions live in `CLAUDE.md` (branching, tags, migrations) and
`documentation/21_Infrastructure-Conventions.md` (Terraform). This file is the *procedure*.

---

## Current state (2026-08-16)

**UAT is live.** First successful Azure deploy 2026-08-16 — `/ready` green with Postgres
and Redis both up, schema migrated, web serving and proxying to the api.

**Prod does not exist yet**, so beta testers still have no access (per D11 they live on
prod). That is the next milestone, after CD.

Data is safe: 12 users / 10 journeys in Neon, plus a local dump at
`../backups/veervrat-neon-20260809T184831Z.dump`.

| Piece | State |
|---|---|
| Azure subscription | `veervrat` · Central India · grant-funded (expires 2027-08-14) |
| Terraform | `infra/terraform/` — `envs/shared` + `envs/uat` applied, `envs/prod` not built |
| Container registry | `veervratacr.azurecr.io` — `veervrat-api`, `veervrat-api-migrate`, `veervrat-web` |
| CI/CD | `ci.yml` + `integration.yml` (PR gates) · `cd.yml` (build → migrate → deploy). GitHub→Azure via OIDC, no stored secrets |
| UAT Postgres | `veervrat-uat-psql` (v18, Burstable B1ms) — running, **schema migrated** (`pg_trgm` allow-listed via `azure.extensions`) |
| UAT Redis | `veervrat-uat-redis` (Azure Managed Redis, Balanced_B0) — running |
| UAT secrets | `veervrat-uat-kv` — holds `database-url`, `redis-url` |
| UAT compute | api + web Container Apps **running** in `veervrat-uat-cae`, scale-to-zero when idle |
| UAT web | https://veervrat-uat-web.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io |
| UAT api | https://veervrat-uat-api.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io |
| prod | not created |
| DNS | zone `veervrat.jnanaprabodhini.org` exists; **NS delegation pending with JP** |
| Email (Resend) | not wired |
| Object storage | **not provisioned** — app still uses the S3 API; needs an SDK swap first |
| Search (Meilisearch) | deferred |

---

## How code reaches each environment

See `CLAUDE.md` → Git conventions for the rules. In short:

```
merge PR to main  →  build image tagged with git SHA  →  push to veervratacr
                  →  auto-deploy that image to UAT

tag prod-YYYY-MM-DD  →  deploy the SAME image to prod
```

**Promote, never rebuild.** The prod deploy ships the exact image UAT exercised.

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

### 8. Record it

Update this file's *Current state* table and `ops/azure-account-facts.md` §5. The facts
file is the source of truth for what exists; if it disagrees with reality, reality is a bug
in the file.

---

## Database migrations — manual, never automatic

Per the hard rule in `CLAUDE.md`: migrations are never applied automatically to a deployed
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

# Migrate on the NEW image while the apps still run the OLD one. `--image` overrides the
# job's image for this execution only, which is what makes the ordering enforceable without
# a second terraform apply.
az containerapp job start -n veervrat-$ENV-migrate -g veervrat-$ENV \
  --image "veervratacr.azurecr.io/veervrat-api-migrate:$SHA"

az containerapp job execution list -n veervrat-$ENV-migrate -g veervrat-$ENV -o table
az containerapp job logs show -n veervrat-$ENV-migrate -g veervrat-$ENV --container migrate

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
az containerapp job start -n veervrat-$ENV-migrate -g veervrat-$ENV \
  --image "veervratacr.azurecr.io/veervrat-api-migrate:$SHA" \
  --command "/bin/sh" "-c" \
  --args "cd /app/apps/api && ./node_modules/.bin/ts-node --transpile-only src/database/seed.ts"
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

### web — all **build-time**, inlined into the browser bundle

Changing any of these requires a **rebuild**, not just a restart.

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | see the same-origin note below |
| `API_ORIGIN` | target of the `/api/v1/*` rewrite proxy, if the proxy is used |
| `NEXT_PUBLIC_SITE_URL` | og:image / canonical URL base |
| `NEXT_PUBLIC_FEEDBACK_MODE` | `test` = list + form, `public` = form only, unset = hidden |
| `NEXT_PUBLIC_COMMIT_SHA` | build id attached to feedback reports |

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
- [ ] Wire Resend and verify SPF/DKIM/DMARC **on the subdomain**, never the root — the root
      carries JP's live Google Workspace mail (D9, and §7 guardrails in the facts doc).
- [ ] Point beta testers at the new URL.

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
| Email (verification, password reset) doesn't deliver | Resend not wired |
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
| `CONTENT_EDITOR_USER_IDS` | comma-separated UUIDs; empty = nobody (fail-closed) |
| `CONTENT_EDIT_GITHUB_TOKEN` | fine-grained PAT, this repo only, Contents + PR write |
| `CONTENT_EDIT_GITHUB_REPO` | `veer-vrat/veervrat-app` |
| `CONTENT_EDIT_GITHUB_BASE_BRANCH` | `main` |

Overrides stage in object storage under `content-overrides/`, so this feature also waits on
the Blob migration. Which environment it runs in is still open (O7).
