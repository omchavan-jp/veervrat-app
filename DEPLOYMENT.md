# Deployment Runbook — Veervrat (private beta)

Stack (decided 2026-07-01): **Railway** (web + api) · **Neon** (Postgres) · **Upstash**
(Redis) · **Cloudflare R2** (object storage) · **Cloudflare** (CDN/DNS). Meilisearch
**deferred** (search hidden/degraded in beta). MinIO is local-dev only — never deployed.

---

## Current live state (as of 2026-07-04)

Deployed 2026-07-03. **Deploy branch is `dev`** (both services), not `main` — revisit
when a real staging/prod split is needed.

| Piece | Live value |
|---|---|
| web | `https://web-production-1fec3.up.railway.app` (Railway, US West) |
| api | `https://api-production-496bd.up.railway.app` (Railway, US West) |
| Postgres | Neon, us-east-1, pooled connection — migrated (18 migrations) + seeded |
| Redis | Upstash, us-east-1 |
| Object storage | Cloudflare R2 bucket `veervrat-uploads-dev`, public via `pub-*.r2.dev` |
| Search | **Meilisearch NOT deployed** — search features hidden/degraded |
| Email | **Resend NOT wired** — signup verification / password reset don't deliver |

**Same-origin proxy (important architectural deviation):** web and api are separate
`up.railway.app` subdomains (a public-suffix domain), so browsers block the api's session
cookie as third-party. Fix: `apps/web/next.config.ts` rewrites `/api/v1/:path*` →
`API_ORIGIN` (the api service). Consequences:
- web build vars: `NEXT_PUBLIC_API_URL=/api/v1` (**relative**), `API_ORIGIN=<api URL>`,
  `NEXT_PUBLIC_SITE_URL=<web URL>` (og/canonical URLs).
- `GOOGLE_CALLBACK_URL` points at the **web** origin (`https://<web-url>/api/v1/auth/google/callback`)
  so the OAuth callback's Set-Cookie is first-party. The Google console lists the web-origin
  callback.
- Auth cookies are `SameSite=None` in prod via `cookieSameSite()`
  (`apps/api/src/common/http/cookie.ts`); set `COOKIE_SAMESITE=lax` once web+api share a
  custom domain.
- **WebSocket chat does not work** — Next rewrites don't proxy Socket.IO. Needs the
  custom-domain setup (step 8) to fix.

**Migrations/seed against prod** run from the local Docker build stage image
(`veervrat-api-build:local`, which has the Prisma CLI + ts-node), never automated:
```bash
docker build -f apps/api/Dockerfile --target build -t veervrat-api-build:local .
docker run --rm -e DATABASE_URL="<neon-DIRECT-url>" veervrat-api-build:local \
  npx prisma migrate deploy --schema prisma/schema.prisma
# seed (idempotent):
docker run --rm -e DATABASE_URL="<neon-pooled-url>" -w /app/apps/api veervrat-api-build:local \
  ./node_modules/.bin/ts-node --transpile-only src/database/seed.ts
```
Use the **direct** (non-pooler) Neon host for `migrate deploy`; the pooled host for runtime.

> The sections below are the original provisioning runbook, kept for re-provisioning or
> staging setup. Steps marked **[you]** require dashboard clicks / credentials. Where
> reality diverged, the live-state section above wins.

---

## 0. Prerequisites
- Code pushed to GitHub (see `PUSH_INSTRUCTIONS.md`) — CI activates automatically.
- Accounts: Railway, Neon, Upstash, Cloudflare (all have free tiers).
- `railway` CLI optional but handy: `npm i -g @railway/cli`.

---

## 1. Provision data services **[you]**

### 1a. Neon (Postgres)
1. neon.tech → new project (region near your Railway region).
2. Copy the **pooled** connection string (has `-pooler` in the host). Keep the
   `?sslmode=require` suffix. This is your `DATABASE_URL`.
3. (Optional) create a separate branch/project for staging.

### 1b. Upstash (Redis)
1. upstash.com → Redis → create database (same region if possible).
2. Copy the connection URL that starts with `rediss://` (TLS). This is your `REDIS_URL`.

### 1c. Cloudflare R2 (object storage)
1. Cloudflare dashboard → R2 → create bucket (e.g. `veervrat-uploads`).
2. R2 → Manage API Tokens → create token (Object Read & Write). Note the
   **Access Key ID**, **Secret Access Key**, and the **S3 API endpoint**
   (`https://<accountid>.r2.cloudflarestorage.com`).
3. Enable public access (or a public dev subdomain) for the bucket → that public URL is
   `S3_PUBLIC_URL`.
   - `S3_ENDPOINT` = the r2.cloudflarestorage.com endpoint
   - `S3_REGION` = `auto`
   - `S3_BUCKET` = your bucket name
   - `S3_ACCESS_KEY` / `S3_SECRET_KEY` = the token pair

---

## 2. Create the Railway project **[you]**
1. railway.app → New Project → Deploy from GitHub repo → pick this repo.
2. Create **two services** from the same repo:
   - **api** — Railway reads `apps/api/railway.json` (Dockerfile build, healthcheck `/ready`).
   - **web** — Railway reads `apps/web/railway.json`.
   - If Railway auto-detects only one, add the second service manually and set its config
     path / root. Both Dockerfiles expect the **repo root** as build context (they COPY
     `pnpm-lock.yaml` etc.) — this is the Railway default.
3. Set each service's **branch**: `main` for the production environment (create a second
   Railway *environment* off `dev` for staging later — step 8).

---

## 3. Configure environment variables **[you]**

Set these in Railway per service (Settings → Variables). Never commit real values.

### api service
| Var | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | (leave unset) | Railway injects it; main.ts reads it |
| `DATABASE_URL` | Neon pooled string | from 1a |
| `REDIS_URL` | Upstash `rediss://…` | from 1b |
| `SESSION_SECRET` | 32+ random chars | `openssl rand -base64 32` |
| `SESSION_COOKIE_NAME` | `veervrat_session` | or keep default |
| `SESSION_TTL_DAYS` | `30` | |
| `CSRF_COOKIE_NAME` | `csrf-token` | or keep default |
| `FRONTEND_URL` | web service public URL | set AFTER web has a URL (step 6) — CORS + cookie origin |
| `S3_ENDPOINT` | R2 endpoint | from 1c |
| `S3_REGION` | `auto` | |
| `S3_BUCKET` | bucket name | |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | R2 token pair | |
| `S3_PUBLIC_URL` | bucket public URL | |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth creds | **REQUIRED at boot** — from Google Cloud console. Missing/empty = the api crash-loops (`GoogleStrategy` reads these via `getOrThrow`, and they are NOT in the Joi schema so there is no friendly validation error). Set all three before first deploy. |
| `GOOGLE_CALLBACK_URL` | `https://<api-url>/api/v1/auth/google/callback` | **REQUIRED at boot** — must match Google console |
| `GLITCHTIP_DSN` | (optional) | enables error tracking; safe to leave unset |
| `MEILI_HOST` / `MEILI_MASTER_KEY` | (leave unset) | search deferred |

### web service
| Var | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api/v1` | **BUILD-TIME** var, inlined into the browser bundle. Relative because of the same-origin proxy (see live-state section). Changing it requires a rebuild. |
| `API_ORIGIN` | `https://<api-url>` | **BUILD-TIME** — target of the `/api/v1/*` rewrite proxy. |
| `NEXT_PUBLIC_SITE_URL` | `https://<web-url>` | **BUILD-TIME** — og:image / canonical URL base. |
| `NEXT_PUBLIC_FEEDBACK_MODE` | `test` | **BUILD-TIME** — feedback widget: `test` (list + form), `public` (form only), unset = hidden. |
| `NEXT_PUBLIC_COMMIT_SHA` | `${{RAILWAY_GIT_COMMIT_SHA}}` | **BUILD-TIME** — build id attached to feedback reports (falls back to `dev`). |

> Chicken-and-egg: web needs the api URL and api needs the web URL. Deploy api first
> (step 5) to get its URL, set `NEXT_PUBLIC_API_URL`, deploy web (step 6), then set the
> api's `FRONTEND_URL` to the web URL and redeploy api. Railway URLs are stable per
> service, so you can also pre-generate domains in Settings → Networking before deploying.

---

## 4. Run database migrations against prod **[you]** — MANUAL, never automated
Per project hard rule (`CLAUDE.md`): migrations run manually after review, never
auto-applied to production.

From your machine, pointed at the prod DB:
```bash
cd apps/api
DATABASE_URL="<neon-prod-url>" pnpm db:migrate:deploy
```
`db:migrate:deploy` = `prisma migrate deploy` (applies committed migrations only; never
generates or resets). Verify:
```bash
DATABASE_URL="<neon-prod-url>" npx prisma migrate status
```
(Optional) seed reference data if the app needs it:
```bash
DATABASE_URL="<neon-prod-url>" pnpm --filter api seed
```

---

## 5. Deploy the api **[you]**
1. Trigger the api service deploy (push to `main`, or Railway → Deploy).
2. Watch the build (Dockerfile: deps → prisma generate → build → prune → runtime).
3. When live, Railway shows a public URL. Confirm health:
   ```bash
   curl https://<api-url>/ready
   # → {"status":"ok","checks":{"database":"up","redis":"up"}}
   ```
   `/ready` actually pings Neon + Upstash — a green here means env vars + networking are
   correct. `/health` is the cheap liveness probe.

---

## 6. Deploy the web **[you]**
1. Set `NEXT_PUBLIC_API_URL=https://<api-url>/api/v1` (build variable).
2. Deploy the web service.
3. Get its public URL → go back and set the api's `FRONTEND_URL` to it → redeploy api
   (so CORS allows the web origin and session cookies are scoped correctly).

---

## 7. Smoke test **[you]**
- `GET https://<api-url>/ready` → all `up`.
- Open the web URL → sign up / log in → confirm the session cookie is set and a
  dashboard loads. (Email verification needs Resend wired — see Known gaps.)
- Upload an image somewhere (chat/experience) → confirm it lands in R2.

---

## 8. Domain, DNS, staging **[you]**
- Cloudflare: add your domain, point DNS (CNAME) at the Railway web service; add the
  api subdomain similarly. Enable Cloudflare proxy (CDN).
- Update `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `GOOGLE_CALLBACK_URL` to the custom
  domains; redeploy.
- **Staging:** in Railway create a second *environment* tracking the `dev` branch, with
  its own Neon branch + Upstash db + env vars. Prod tracks `main`.

---

## Known gaps to close before/around launch
- **WebSocket chat:** Socket.IO is not proxied by the Next.js rewrites, so real-time chat
  is broken on the railway.app URLs. Fixed by moving web+api onto a shared custom domain
  (`app.<domain>` / `api.<domain>`), after which the proxy and `SameSite=None` can both be
  retired (`COOKIE_SAMESITE=lax`).
- **Email (Resend):** verification / password-reset emails are console-logged in dev and
  not wired to a provider — signup verification + password recovery won't deliver until
  Resend is integrated (approved in the platform standard, not yet implemented).
- **Backups:** Neon provides point-in-time restore on its plans — confirm the retention
  on your tier; that satisfies the audit's backup gap for managed PG.
- **Search:** deferred; add a Meilisearch Railway container + `MEILI_HOST`/
  `MEILI_MASTER_KEY` when entity-search/VM-invite lookup is needed.
- **CI → CD automation:** current CI gates PRs; auto-deploy on merge to `main` can be
  added later (Railway deploys on push by default once the GitHub link is set).

---

## Rollback
Railway keeps prior deployments — Deployments tab → pick a previous green deploy →
Redeploy/Rollback. DB migrations are forward-only; a bad migration is reverted with a new
corrective migration (never `migrate reset` on prod).
