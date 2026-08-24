# Observability Standard — v1

> **This describes the target state. It is not yet implemented — see issue #79.**
> Rewritten 2026-08-16: GlitchTip was dropped in favour of Sentry + Azure Application
> Insights (D8). The logging schema, metrics and privacy rules below survived that swap
> unchanged — only the tools differ.

## Tools

**Two tools because they answer different questions.** Sentry answers *"why did this
request fail"* — a stack trace, the user, the release. App Insights answers *"is the system
healthy"* — request rates, dependency latency, container restarts. Neither substitutes for
the other, and both are free at this scale.

| Concern | Tool | Status |
|---|---|---|
| Error tracking (app) | **Sentry** free tier | ✅ **api: live in both UAT and prod. web: live in UAT only** — prod's web container has no `SENTRY_DSN` at all as of 2026-08-24, pending a `prod-*` tag that includes #175. Both verified by triggering a real error and confirming it arrived in Sentry, not by the config looking right. The app logs `Error tracking DISABLED` on startup wherever the DSN is unset, rather than staying silent |
| Platform telemetry | **Azure Application Insights** | **Dropped, 2026-08-23** — decided against, not merely unstarted. Was the only Azure-coupled piece of this plan; adopting it would mean instrumentation to rewrite the day the platform changes. See the decision section below |
| Structured logging | Pino (NestJS) + browser console (Next.js) | ✅ Working — Pino → stdout in prod, collected by Container Apps |
| Alerting (infra) | Azure Monitor metric alerts | ✅ Partially — Postgres `storage_percent > 80%` is live (see `21_Infrastructure-Conventions.md` §13) |
| Alerting (app errors) | Sentry alert rules | ❌ Pending issue #79 |
| Uptime | External ping (UptimeRobot free tier or similar) | ❌ Not set up |

⚠️ **Until issue #79 lands there is no application error tracking in any deployed environment.**
This should close before beta testers reach prod.

---

## Structured Logging

### Backend (NestJS — Pino)
Every log line is JSON with these fields:

```json
{
  "level": "info",
  "timestamp": "2026-06-03T10:00:00.000Z",
  "correlationId": "uuid",
  "userId": "uuid or null",
  "action": "journey.create",
  "resourceType": "journey",
  "resourceId": "uuid",
  "durationMs": 42,
  "status": "success",
  "message": "Journey created"
}
```

### Correlation ID
- Generated per request in a NestJS middleware
- Passed to all downstream calls (DB, Redis, external APIs)
- Included in all log lines and error reports
- Returned to the client in `X-Correlation-Id` response header (for debugging)

### What to log
- All auth events (success/failure) — `action: auth.*`
- All admin/moderator actions — `action: admin.*`, `action: moderator.*`
- API request/response (status, duration, route — not body)
- Background job execution (start, success, failure, duration)
- WebSocket connection/disconnection
- External calls (SMTP relay, Meilisearch, MinIO) — status, duration, error if any
- OG metadata fetch — URL, status, duration, blocked (SSRF)

### What NOT to log
- Request/response bodies (PII risk)
- Passwords, tokens, session values — never, under any circumstances
- User-generated content (blog bodies, chat messages, experience logs)
- Full stack traces in production info-level logs (only in error-level)

### Frontend (Next.js)
- v1: `console.error` with structured context for client-side errors captured by Sentry
- No custom frontend logging library in v1 — the Sentry SDK captures unhandled errors automatically

---

## Key Metrics (v1 baseline)

| Metric | Source | Alert threshold |
|---|---|---|
| API request latency p95 | App Insights (platform) | > 2s sustained for 5 min |
| 5xx error rate | App Insights, cross-checked in Sentry | > 1% of requests in 5 min window |
| Auth failure rate | Custom counter in auth service | > 50 failures / min (global) |
| Background job failure | Log-based (job logs error level) | Any failure triggers alert |
| WebSocket connection count | NestJS Gateway metric | Informational — no alert |
| Search query latency | Meilisearch built-in metrics | > 500ms p95 — *Meilisearch is deferred, not deployed* |
| Notification delivery failure | log-based (SMTP send errors) | Any send failure — *email delivers since 2026-08-17; this alerting is still unbuilt*. Note: an SMTP relay gives no bounce webhook, unlike Resend — bounces are invisible to us, so log-based send-failure alerting is all we get |
| Uptime | External ping | < 99.5% in 24h window |

---

## Where error data is stored (2026-08-23)

Hosted Sentry offers **EU or US only** — there is no India region. **EU chosen.** GDPR-grade
protection applies by default, and US providers are reachable under the CLOUD Act, so for a
JP-run Indian service the EU is the defensible answer if anyone asks.

**This contradicts a published sentence** and must be corrected, not quietly accepted. The live
privacy policy says *"Your data is stored in India, on Microsoft Azure's Central India region."*
Diagnostics now leave the country. That amendment joins the version bump already owed for the
retained Google sign-in link and the stored Google profile photo — one bump, four items, not
three separate ones.

**Lawful, for the avoidance of doubt.** DPDP 2023 permits cross-border transfer except to
countries the government notifies as restricted; none have been notified. The problem was never
legality, it was a sentence that had stopped being true.

**What actually leaves:** 5xx exceptions only, with `sendDefaultPii: false` (no cookies, headers,
IP addresses or user records) and a `beforeSend` scrubber that redacts email addresses and long
opaque tokens from message text. Diagnostics crossing a border is a disclosed, deliberate
exception; an email address crossing with them is not.

**The exit, if localisation ever becomes a hard requirement:** self-hosted GlitchTip in Central
India speaks the same protocol, so it is a change to `SENTRY_DSN` and nothing else. It was not
chosen now because it needs a web container, a worker, Postgres and Redis — real cost and real
maintenance on a grant budget — while production currently has *no* error visibility at all.
Visibility that is disclosed and scrubbed beats perfect localisation that sees nothing.

---

## Azure App Insights — dropped (2026-08-23)

Earlier documents name "Sentry + Azure App Insights" as the observability plan. **App Insights
is not being built**, and nothing was ever started — there is no code, no Terraform, no
resource. Recorded here because three documents promised it.

Two reasons, and the first is the one that decides it:

- **It is the only Azure-coupled piece of the plan.** Everything else here survives a move to
  another provider untouched: pino writes JSON to stdout, which every platform collects, and the
  Sentry SDK speaks a protocol rather than to a vendor. Adopting App Insights would mean
  instrumentation code that has to be rewritten on the day the platform changes — the coupling
  the portability workstream exists to avoid.
- Its value is traces and platform metrics, which is what any replacement provides anyway.

**What replaces it:** nothing, deliberately. Errors go to Sentry; logs go to stdout and are
collected by whatever the platform provides — Log Analytics today, something else after a move.
Log Analytics is a *sink*, not the strategy, and no code depends on it.

**If platform-level metrics are wanted later**, the portable answer is an OpenTelemetry exporter,
which can point at any backend — not a provider-specific SDK.

---

## Sentry configuration (app errors)

### Backend (`@sentry/node`)
- DSN from **`SENTRY_DSN`**, sourced from the environment's Key Vault — never an inline value.
- **The app announces its own state on startup**, enabled or not. An unset DSN previously meant
  silence, and silence read as health: error tracking sat recorded as DONE in the readiness
  audit while `Sentry.init` had never run in any environment. A control that cannot be seen to
  be off will eventually be off.
- Terraform creates the `sentry-dsn` secret but never its value. Until it is set out of band the
  app receives a placeholder, recognises it is not a DSN URL, and reports itself disabled rather
  than enabling and failing to send.
- Capture: unhandled exceptions, unhandled promise rejections
- **Release = the git SHA already used as the image tag.** CD builds every image tagged with
  it, so a Sentry release maps 1:1 to a deployed image with no extra bookkeeping
- Environment: `development` · `uat` · `prod` (matching the deployed environments, D10 —
  there is no `staging`)
- Sample rate: 100% for errors, 10% for performance transactions

### Frontend (`@sentry/nextjs`)
- DSN via **`NEXT_PUBLIC_SENTRY_DSN`** — ⚠️ `NEXT_PUBLIC_*` is **inlined at build time**, so
  it is baked into the image and cannot differ between UAT and prod on a promoted image. Same
  constraint that forces #40. Decide with #79 whether the frontend DSN is shared across
  environments (distinguished by the `environment` tag) or the gating moves server-side
- Capture: unhandled JS errors, React error boundaries, failed API calls
- Source maps uploaded on build for readable stack traces

### Alert rules (Sentry UI)
- New unresolved issue → email
- Issue frequency > 10 occurrences in 1 hour → high priority
- Auth failure spike (tag `action:auth.*` > 50/min) → alert (referenced by
  `14_Auth-Architecture-Decision.md` §16)

Recipients must be **`@jnanaprabodhini.org`** addresses — the `@jppune.onmicrosoft.com`
mailboxes exist but nobody reads them, so an alert delivered there is functionally lost.

## Application Insights configuration (platform health)

Not yet provisioned. When #79 lands it needs both an `azurerm_application_insights` resource
in `modules/environment` (so UAT and prod each get their own, like every other stateful
resource) and the SDK wired in the api. It should answer: request rate and latency,
dependency calls to Postgres/Redis, container restarts, and cold-start frequency — the last
one matters because `min_replicas = 0` means every idle period ends in a cold start.

---

## Privacy Filtering
- All logs and error reports must be scrubbed of:
  - Passwords and tokens
  - Email addresses (replace with `user:<userId>`)
  - Chat message content
  - Experience log content
  - Full request bodies
- Sentry: configure a `beforeSend` hook to strip sensitive fields
- Pino: use `redact` option for known sensitive paths (`req.body.password`, `req.headers.cookie`)

---

## Incident Response (v1 — lightweight)
- On alert: check Sentry for the error and its release → correlate logs via `correlationId`
  (Container Apps logs, or App Insights once wired) → diagnose → fix → ship via CD
- No formal runbook in v1 — this section expands as operational maturity grows
- Post-incident: write a brief summary (what happened, what was the impact, what was fixed) in a `documentation/incidents/` folder
