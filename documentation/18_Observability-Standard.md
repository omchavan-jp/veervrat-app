# Observability Standard — v1

## Tools

| Concern | Tool | Status |
|---|---|---|
| Error tracking | GlitchTip (Sentry SDK) | Decided, not set up |
| Structured logging | Pino (NestJS) + browser console (Next.js) | Decided |
| Metrics | GlitchTip performance monitoring + custom counters | v1 baseline |
| Alerting | GlitchTip alert rules | v1 baseline |
| Uptime | External ping (UptimeRobot free tier or similar) | v1 baseline |

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
- External API calls (Resend, Meilisearch, MinIO) — status, duration, error if any
- OG metadata fetch — URL, status, duration, blocked (SSRF)

### What NOT to log
- Request/response bodies (PII risk)
- Passwords, tokens, session values — never, under any circumstances
- User-generated content (blog bodies, chat messages, experience logs)
- Full stack traces in production info-level logs (only in error-level)

### Frontend (Next.js)
- v1: `console.error` with structured context for client-side errors captured by GlitchTip
- No custom frontend logging library in v1 — GlitchTip SDK captures unhandled errors automatically

---

## Key Metrics (v1 baseline)

| Metric | Source | Alert threshold |
|---|---|---|
| API request latency p95 | GlitchTip performance | > 2s sustained for 5 min |
| 5xx error rate | GlitchTip | > 1% of requests in 5 min window |
| Auth failure rate | Custom counter in auth service | > 50 failures / min (global) |
| Background job failure | Log-based (job logs error level) | Any failure triggers alert |
| WebSocket connection count | NestJS Gateway metric | Informational — no alert |
| Search query latency | Meilisearch built-in metrics | > 500ms p95 |
| Notification delivery failure | Resend webhook / log-based | Any bounce/failure |
| Uptime | External ping | < 99.5% in 24h window |

---

## GlitchTip Configuration

### Backend (`@sentry/node`)
- DSN configured via environment variable `GLITCHTIP_DSN`
- Capture: unhandled exceptions, unhandled promise rejections
- Release tracking: set `release` to git commit SHA on deploy
- Environment: `development`, `staging`, `production`
- Sample rate: 100% for errors, 10% for performance transactions (adjustable)

### Frontend (`@sentry/nextjs`)
- DSN configured via environment variable `NEXT_PUBLIC_GLITCHTIP_DSN`
- Capture: unhandled JS errors, React error boundaries, failed API calls
- Same release and environment tagging as backend
- Source maps uploaded on build for readable stack traces

### Alert rules (configured in GlitchTip UI)
- New unresolved issue → email notification to dev team
- Issue frequency > 10 occurrences in 1 hour → high-priority alert
- Auth failure spike (custom tag `action:auth.*` > 50/min) → alert

---

## Privacy Filtering
- All logs and error reports must be scrubbed of:
  - Passwords and tokens
  - Email addresses (replace with `user:<userId>`)
  - Chat message content
  - Experience log content
  - Full request bodies
- GlitchTip: configure `beforeSend` hook to strip sensitive fields
- Pino: use `redact` option for known sensitive paths (`req.body.password`, `req.headers.cookie`)

---

## Incident Response (v1 — lightweight)
- On alert: check GlitchTip for error details → check correlated logs via `correlationId` → diagnose → fix → deploy
- No formal runbook in v1 — this section expands as operational maturity grows
- Post-incident: write a brief summary (what happened, what was the impact, what was fixed) in a `documentation/incidents/` folder
