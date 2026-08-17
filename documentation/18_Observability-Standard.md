# Observability Standard — v1

> **This describes the target state. It is not yet implemented — see backlog B13.**
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
| Error tracking (app) | **Sentry** free tier | SDK installed (`instrument.ts`) but **reads `GLITCHTIP_DSN`** — rename pending, B13 |
| Platform telemetry | **Azure Application Insights** | ❌ Not wired — no SDK, and **no Terraform resource** either. Only Log Analytics exists, and that is for Container Apps logs |
| Structured logging | Pino (NestJS) + browser console (Next.js) | ✅ Working — Pino → stdout in prod, collected by Container Apps |
| Alerting (infra) | Azure Monitor metric alerts | ✅ Partially — Postgres `storage_percent > 80%` is live (see `21_Infrastructure-Conventions.md` §13) |
| Alerting (app errors) | Sentry alert rules | ❌ Pending B13 |
| Uptime | External ping (UptimeRobot free tier or similar) | ❌ Not set up |

⚠️ **Until B13 lands there is no application error tracking in any deployed environment.**
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
| Notification delivery failure | log-based (SMTP send errors) | Any send failure — *email not yet wired, B14*. Note: an SMTP relay gives no bounce webhook, unlike Resend — bounces are invisible to us, so log-based send-failure alerting is all we get |
| Uptime | External ping | < 99.5% in 24h window |

---

## Sentry configuration (app errors)

### Backend (`@sentry/node`)
- DSN from **`SENTRY_DSN`**, sourced from the environment's Key Vault — never an inline value.
  ⚠️ *Today the code reads `GLITCHTIP_DSN` (`apps/api/src/instrument.ts`); GlitchTip is
  Sentry-protocol-compatible, which is why the SDK was pointed at it. Renaming is part of B13
  and touches the Joi schema, `.env.example`, and the Container App env in Terraform.*
- Capture: unhandled exceptions, unhandled promise rejections
- **Release = the git SHA already used as the image tag.** CD builds every image tagged with
  it, so a Sentry release maps 1:1 to a deployed image with no extra bookkeeping
- Environment: `development` · `uat` · `prod` (matching the deployed environments, D10 —
  there is no `staging`)
- Sample rate: 100% for errors, 10% for performance transactions

### Frontend (`@sentry/nextjs`)
- DSN via **`NEXT_PUBLIC_SENTRY_DSN`** — ⚠️ `NEXT_PUBLIC_*` is **inlined at build time**, so
  it is baked into the image and cannot differ between UAT and prod on a promoted image. Same
  constraint that forces B1. Decide with B13 whether the frontend DSN is shared across
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

Not yet provisioned. When B13 lands it needs both an `azurerm_application_insights` resource
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
