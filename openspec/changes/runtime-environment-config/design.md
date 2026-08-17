## Context

Two mechanisms that are individually correct are mutually incompatible:

- **CD promotes one image** from UAT to prod without rebuilding (correct — it is what makes
  "the thing you tested is the thing you ship" true).
- **Next.js freezes build-time values into that image** — `next.config.ts` evaluation and every
  `NEXT_PUBLIC_*`.

Any environment-varying value in the second mechanism is a latent defect. One has already
fired (`API_ORIGIN`: prod web → UAT api); three more are armed.

Relevant existing state, verified in code rather than assumed:

- `apps/api/src/main.ts` already does `enableCors({ origin: process.env.FRONTEND_URL,
  credentials: true })` — CORS exists, but `FRONTEND_URL` currently points at the
  `*.azurecontainerapps.io` host, not the custom domain.
- `apps/api/src/common/http/cookie.ts` already supports a `COOKIE_SAMESITE` override, and its
  docstring explicitly anticipates this change ("set it to `lax` once web and api share one
  parent domain"). The seam was left deliberately; this change uses it.

## Goals / Non-Goals

**Goals**
- No environment-varying value resolved at build time.
- Browser talks to the api directly — no rewrite proxy.
- Session cookies on `SameSite=Lax`.
- A check that fails loudly if a tier is ever wired to the wrong environment again.

**Non-Goals**
- Per-user capability grants (B1). Feature flags here stay environment-level, per D20.
- Chat readiness beyond unblocking WebSocket transport (O8).
- Google OAuth prod credentials (sequenced immediately after).

## Decisions

### 1. Runtime config via a server-read provider, not a fetched endpoint

The web tier is a running Next.js server, so a root server component reads `process.env` per
request and passes a typed config object to client components through a provider.

**Why not a `/config` endpoint fetched client-side:** it adds a round trip before the app can
call the api, and creates a first-paint window where the base URL is unknown — an avoidable
flash and an avoidable failure mode.

**Why not `window.__ENV__` via an inline `<script>`:** works, but loses typing and puts config
assembly in a string template. The provider is the same mechanism with types.

`NEXT_PUBLIC_COMMIT_SHA` **stays baked** — it describes the image, not the environment. That is
the rule this change establishes and it should be applied by asking: *does this value describe
the image, or where the image runs?*

### 2. The browser calls the api directly; the rewrite proxy is deleted

Now possible because `api.veervrat.jnanaprabodhini.org` and `api.uat.veervrat.jnanaprabodhini.org`
are live (2026-08-17). Required regardless of the defect, because Next rewrites do not forward
WebSocket upgrades — the reason chat has never worked in production.

### 3. Cookies: `SameSite=Lax`, scoped to the shared parent domain

| | web | api | registrable domain |
|---|---|---|---|
| prod | `veervrat.jnanaprabodhini.org` | `api.veervrat.jnanaprabodhini.org` | `jnanaprabodhini.org` |
| UAT | `uat.veervrat.jnanaprabodhini.org` | `api.uat.veervrat.jnanaprabodhini.org` | `jnanaprabodhini.org` |

Both tiers share a registrable domain, so requests between them are **same-site** (they are
cross-*origin*, which is a CORS concern, not a cookie concern). `SameSite=Lax` is therefore
correct and strictly stronger than the `None` the proxy era required.

**⚠️ The subtlety that would silently break auth: CSRF is double-submit.** The `csrf-token`
cookie is deliberately non-HttpOnly because client JS must read it and echo it in the
`X-CSRF-Token` header. If the api sets that cookie scoped to its own host
(`api.veervrat.…`), **the web origin cannot read it** — the cookie is delivered to the api
fine, so every request would carry the cookie but no header, and every state-changing request
would fail CSRF validation. The session cookie (HttpOnly) would work, making this look like a
CSRF bug rather than a scoping bug.

Therefore auth cookies are set with an explicit **`Domain` of the shared parent** — for prod
`veervrat.jnanaprabodhini.org`, for UAT `uat.veervrat.jnanaprabodhini.org` — which the api may
do because that is its own parent domain and not a public suffix. This requires a new
per-environment `COOKIE_DOMAIN`, unset in local dev (host-only cookies on `localhost`, which is
already same-site across ports).

### 4. CORS allow-lists the environment's web origin, credentialed

Direct browser→api calls are cross-origin, so `Access-Control-Allow-Origin` must name the web
origin exactly (`credentials: true` forbids `*`). `FRONTEND_URL` moves to the custom domain.

### 5. Ship the api first, then the web

The api must accept the new origin and set cookies on the new domain **before** any browser
starts calling it directly. Reversed, the first request from the new frontend fails CORS. Two
sequenced deploys, each verified — not one.

## Risks / Trade-offs

- **This change can lock every user out.** It touches CORS, cookie scope, `SameSite`, and CSRF
  simultaneously. Mitigation: UAT must be exercised through a **real browser login**, not
  `curl` — `curl` ignores `SameSite` and does not enforce CORS, so it cannot detect the failure
  modes that matter here. Verification must include: log in, reload (session persists), perform
  a state-changing action (CSRF passes), log out.
- **One more moving part in the request path.** Losing the proxy means the browser needs the
  api reachable and correctly CORS-configured; previously the api could have been private. In
  exchange, chat becomes possible and a whole class of build-time bugs disappears.
- **Runtime config costs a small amount of SSR work per request.** Negligible against a round
  trip, and it is the mechanism Next.js intends.

## Migration Notes

`COOKIE_SAMESITE` and `COOKIE_DOMAIN` are per-environment Terraform inputs. Existing sessions
issued with `SameSite=None` and host-only scope are invalidated by the domain change — every
user is logged out once. Acceptable: prod has no users, and UAT has only Nachiket.

## Open Questions

- Should the api also stop being publicly reachable at its `*.azurecontainerapps.io` default
  hostname once the custom domain is live? Not required for correctness; would reduce the
  surface where a request bypasses the expected origin. Deferred — decide with the pre-launch
  VNet work (D15).
