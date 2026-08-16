# Deployment Runbook — Veervrat

The live runbook. **This must describe what is actually deployed**, not what we intend to
deploy. Update it in any infra PR.

Rules and conventions live in `CLAUDE.md` (branching, tags, migrations) and
`documentation/21_Infrastructure-Conventions.md` (Terraform). This file is the *procedure*.

---

## Current state (2026-08-16)

**The app is not deployed.** Railway was removed when its trial expired; Azure
infrastructure exists but no application is running on it yet. Beta testers have no access.

Data is safe: 12 users / 10 journeys in Neon, plus a local dump at
`../backups/veervrat-neon-20260809T184831Z.dump`.

| Piece | State |
|---|---|
| Azure subscription | `veervrat` · Central India · grant-funded (expires 2027-08-14) |
| Terraform | `infra/terraform/` — `envs/shared` + `envs/uat` applied, `envs/prod` not built |
| Container registry | `veervratacr.azurecr.io` — first images being pushed (`veervrat-api`, `veervrat-api-migrate`, `veervrat-web`) |
| UAT Postgres | `veervrat-uat-psql` (v18, Burstable B1ms) — running, **schema not migrated** |
| UAT Redis | `veervrat-uat-redis` (Azure Managed Redis, Balanced_B0) — running |
| UAT secrets | `veervrat-uat-kv` — holds `database-url`, `redis-url` |
| UAT compute | `veervrat-uat-cae` (Container Apps Environment) — apps defined in Terraform behind `deploy_apps`, **first deploy in progress** |
| UAT app URLs | predicted from the environment's default domain: `veervrat-uat-{api,web}.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io` |
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

tag prod-YYYY-MM-DD  →  manual approval  →  deploy the SAME image to prod
```

**Promote, never rebuild.** The prod deploy ships the exact image UAT exercised.

Local development is `docker-compose` and is not a deploy target — no pipeline touches it.

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

```bash
ENV=uat   # or prod
SHA=$(git rev-parse --short HEAD)

# 1. Build both images from the same commit, so migrations and app can never drift
az acr build --registry veervratacr --image "veervrat-api:$SHA" \
  --file apps/api/Dockerfile .
az acr build --registry veervratacr --image "veervrat-api-migrate:$SHA" \
  --target build --file apps/api/Dockerfile .

# 2. Point the environment at the new tag and apply (creates/updates the job + apps)
cd infra/terraform/envs/$ENV
terraform apply -var="image_tag=$SHA" -var="deploy_apps=true"

# 3. Run migrations — deliberate, separate, before the app serves the new schema
az containerapp job start -n veervrat-$ENV-migrate -g veervrat-$ENV

# 4. Watch it
az containerapp job execution list -n veervrat-$ENV-migrate -g veervrat-$ENV -o table
az containerapp job logs show -n veervrat-$ENV-migrate -g veervrat-$ENV --container migrate
```

`prisma migrate deploy` applies committed migrations only — it never generates one and
never resets. `replica_retry_limit = 0` is deliberate: re-running a partially-applied
migration should be a human decision, not an automatic retry.

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
