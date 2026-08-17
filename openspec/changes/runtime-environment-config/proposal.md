## Why

**Prod's frontend was talking to UAT's backend.** Found 2026-08-17, reproduced 3/3, with
prod live and `/ready` green on both tiers. Every request a prod user made would have read
and written UAT's database. Blast radius was zero only because prod had no users yet.

`apps/web/next.config.ts` reads `process.env.API_ORIGIN` at module scope to build the
`rewrites()` destination. Next.js evaluates `rewrites()` at **build time** and freezes the
resolved destination into `routes-manifest.json`. The runtime variable is then never
consulted — Terraform was setting `API_ORIGIN` correctly on prod's web app and it was
silently ignored. CD builds the image once with UAT's value and promotes that same image to
prod, exactly as designed ("promote, never rebuild"). The deploy model and the config
mechanism are individually correct and mutually incompatible.

This is not one bad variable. It is a **category error**:

> Anything resolved at build time cannot vary per environment under "promote, never rebuild".

Next.js freezes two categories into the image: `next.config.ts` evaluation (`rewrites`,
`redirects`, `headers`) and every `NEXT_PUBLIC_*` inlined into the client bundle. Current
instances:

| Baked value | Consequence on prod |
|---|---|
| `API_ORIGIN` via `rewrites()` | **prod web → UAT api** (this defect) |
| `NEXT_PUBLIC_SITE_URL` | `og:url` / `og:image` point at UAT — every link preview wrong |
| `NEXT_PUBLIC_FEEDBACK_MODE` | cannot differ UAT vs prod (already drove B1) |
| `NEXT_PUBLIC_CONTENT_EDIT` | same |

`NEXT_PUBLIC_COMMIT_SHA` is correctly baked: it describes the *image*, not where it runs.
That is the discriminator this change establishes — **does the value describe the image, or
the environment it runs in?** Only the former may be baked.

Fixing only `API_ORIGIN` would leave the same trap armed for the next variable. This change
removes the mechanism.

## What Changes

**1. Environment config is delivered at runtime, not inlined at build.**
The web tier is a running Next.js server and can read `process.env` per request. Public
runtime configuration is read server-side and passed to client components through a provider,
rather than inlined by the bundler. `NEXT_PUBLIC_*` is retired for anything environment-varying.

**2. The `/api/v1` rewrite proxy is removed; the browser talks to the api directly.**
`api.veervrat.jnanaprabodhini.org` and `api.uat.veervrat.jnanaprabodhini.org` went live
2026-08-17, which makes this possible for the first time. This is required independently of
the defect:

- Next rewrites **do not forward WebSocket upgrades** — the documented reason chat has never
  worked in production (O8). The proxy cannot stay if chat is ever to work.
- The proxy exists solely to make cookies first-party, a workaround for web and api being
  cross-site on `*.up.railway.app`. That constraint is gone: both hosts now share the
  registrable domain `jnanaprabodhini.org`, so they are **same-site**.

**3. Session cookies drop `SameSite=None`.**
With a shared registrable domain, `SameSite=Lax` is correct and strictly stronger. `None`
was only ever required because the two tiers were cross-site.

**4. The api gains explicit CORS for the web origin, credentialed.**
Direct browser→api calls are cross-*origin* (different host) even though same-*site*, so CORS
with `credentials: true` and an allow-list of the environment's web origin is now required.

**5. A post-deploy check asserts cross-tier wiring.**
The defect was invisible to every existing check because each service was individually
healthy. CD gains a verification that the web tier resolves to its **own** environment's api.

### Explicitly not in scope

- **The B1 capability model.** This change makes per-environment *feature flags* possible at
  runtime; it does not implement per-user grants. `NEXT_PUBLIC_FEEDBACK_MODE` /
  `NEXT_PUBLIC_CONTENT_EDIT` move to runtime config as environment-level toggles only —
  exactly the split D20 defines. B1 remains a separate change.
- **Chat production-readiness (O8).** Removing the proxy unblocks WebSocket transport; it does
  not deliver reconnection, delivery guarantees, or offline handling.
- **Google OAuth prod credentials.** Prod still carries `placeholder-not-configured`. Separate,
  tracked, sequenced immediately after this.

## Impact

- Affected specs: `runtime-configuration` (new), `session-cookies`, `api-cors`
- Affected code: `apps/web/next.config.ts`, `apps/web/lib/api/client.ts`, `apps/web/proxy.ts`,
  the six components reading `NEXT_PUBLIC_API_URL`, `apps/web/app/layout.tsx`,
  `apps/api/src/bootstrap.ts` (CORS), session cookie construction in `apps/api`,
  `infra/terraform/modules/environment/container-apps.tf`, `.github/workflows/cd.yml`
- **Risk: this change touches authentication.** A mistake locks every user out rather than
  degrading quietly. UAT must be exercised through a real browser login (not only `curl`)
  before a prod tag is cut.
- **Ordering constraint:** the api must accept the new CORS origin **before** the web tier
  starts calling it directly, or the first request from the new frontend fails. api ships
  first, verified, then web.
