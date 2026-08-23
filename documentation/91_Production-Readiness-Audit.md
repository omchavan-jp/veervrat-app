# Production Readiness Audit

> 📌 **Point-in-time record — 2026-07-01. Do not update it; read it as history.**
> Its value is as a snapshot of what was true before the Azure migration. Several findings
> have since been addressed — the verdict below says "no deployment, no CI/CD, no error
> tracking, no backups"; as of 2026-08-16 the first three are wrong:
>
> | Then | Now |
> |---|---|
> | no deployment | UAT live on Azure, prod infra provisioned |
> | no CI/CD | CD pipeline live (OIDC, build→migrate→deploy) |
> | no backups | Postgres Flexible Server, 7-day UAT / 35-day prod retention + PITR |
> | no error tracking | ⚠️ **still true** — decided (D8) but unimplemented, issue #79 |
>
> Current status lives in `01_System-Decisions-and-Status.md` and `../ops/PROJECT-STATUS.md`.

_Generated from a code-grounded audit (not spec-based). Each item: DONE / PARTIAL / MISSING with file evidence._

## Verdict

The **application code is genuinely production-grade** — properly layered, with real authz, validation, CSRF, rate limiting, and a well-indexed schema. This is NOT a "vibecoded 2-layer" app. The gap is **operational**: there is no deployment, no CI/CD, no error tracking, no backups. Plus a handful of concrete code bugs worth fixing regardless of launch timing.

Do NOT rebuild what exists. The real work is the ops/deploy cluster + a short bug-fix pass.

---

## Cluster A — Application security & data isolation: STRONG (mostly DONE)

| Item | Status | Evidence |
|---|---|---|
| User data isolation (per-user scoping) | DONE | Guard identity + service-layer ABAC `hasPermission()`; verified on journeys/experience-logs/blogs/notifications list+get |
| IDOR (get-by-id ownership) | DONE | `/journeys/:id`, `/experiences/:id`, `/tests/:id` all verify caller access before returning |
| Input validation | DONE | Global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` in bootstrap.ts; DTOs on all controllers |
| SQL injection | DONE | Prisma only; zero `$queryRaw`/`$executeRaw` |
| XSS | DONE | No `dangerouslySetInnerHTML`; Tiptap sanitized server-side (node/mark allowlist) + safe React render |
| Mass assignment | DONE | Explicit field mapping everywhere; no body-spread into Prisma |
| Password hashing | DONE | bcrypt, cost 12 |
| Brute-force / lockout | DONE | Redis lockout: 10 fails/hr → 15min lock; per-route throttle on login/signup/forgot |
| Session cookies | DONE | httpOnly + sameSite=lax + secure(prod); PG-backed, rolling 30d TTL |
| CSRF | DONE (1 bug) | Double-submit cookie, global guard — but see BUG-2 |
| Secrets management | DONE | Joi-validated env, `.env` gitignored, `.env.example` present |
| Password-reset token TTL | DONE | 1 hour, enforced, all sessions killed on reset |

**Concrete bugs found (fix now, cheap):**
- **BUG-1 (CRITICAL): Google-link token expiry not checked.** `auth.service.ts linkGoogleAccount()` fetches the token but never validates `expiresAt` (15-min TTL is set but unenforced). Add the expiry check.
- **BUG-2 (CRITICAL): `confirm-email-change` will fail CSRF.** Endpoint is called from an email link (no session → no CSRF token) but lacks `@SkipCsrf()`. It's currently broken in prod. Add the decorator (matches the pattern used by verify-email/link-google).
- **BUG-3 (HIGH): `reset-password` endpoint unthrottled.** `forgot-password` is throttled 5/hr but `reset-password` has none. Add matching `@Throttle`.
- **BUG-4 (MED): uploads controller uses an interface, not a DTO** — bypasses the global ValidationPipe. Convert to a class-validator DTO.
- **BUG-5 (MED): ~~admin suspend doesn't force-logout~~ — FALSE POSITIVE.** Verified: `AdminUsersService.setSuspended` already calls `auth.forceLogout(id)` → `deleteAllUserSessions`. No change needed.

**Status (2026-07-01):** BUG-1..4 fixed on `fix/prod-readiness-bugs`; BUG-5 was already handled. 639 api tests green.

---

## Cluster B — Ops / observability / hardening: MOSTLY DONE (as of 2026-07-01)

| Item | Status | Evidence / gap |
|---|---|---|
| Rate limiting | DONE | reset-password now throttled 5/hr (BUG-3 fixed) alongside global 300/min + auth overrides |
| Error tracking (Sentry) | **PARTIAL** | Plumbing complete and a DSN is wired from Key Vault, but **no DSN value has been set in any environment**, so nothing is captured yet. Previously recorded here as DONE while `Sentry.init` had never once run — the code was present, the condition never true, and the silence read as health. The app now states on startup whether tracking is on. Issue #79 |
| Security headers (Helmet) | DONE | `helmet()` in `configureApp` (CSP/COEP off — API is JSON-only); nosniff + X-Frame-Options verified in integration test |
| Health check | DONE | `/health` = cheap liveness; new `/ready` = readiness (pings DB+Redis, 503 if down); integration-tested |
| CORS | PARTIAL | Restricted to `FRONTEND_URL` + credentials; no URL-format validation at boot (low risk — deploy sets a fixed origin) |
| Error handling | OK (was over-flagged) | Global filter returns generic messages, never leaks internals; logging 5xx stacks server-side is desirable, not a leak |
| Structured logging | PARTIAL | Pino + correlation-id wired; redaction minimal (cookie/password only — not email/PII). Follow-up if PII-in-logs matters. |

---

## Cluster C — Deployment / CI-CD / infra: WEAKEST (mostly MISSING) — this is the real work

| Item | Status | Evidence / gap |
|---|---|---|
| DB indexes | DONE | 30+ indexes; all hot FK paths covered (vratarthi_id, journey_id, recipientId+readAt, roomId+seqNo…) |
| Build setup | DONE | Turbo build works; `dist/` + `.next/` outputs; `start:prod` scripts exist |
| **CI pipeline** | **DONE** (2026-07-01) | `.github/workflows/ci.yml` (lint+typecheck+unit+build) + `integration.yml` (Postgres+Redis service containers, migrate, integration tests). Activate on first push. All steps verified green locally. |
| Lint health | DONE (2026-07-01) | Was broken/masked: web eslint couldn't run (missing dep, fixed via explicit deps); api had 1290 errors hidden by `--fix` + an eslint/prettier config conflict (fixed via shared `.prettierrc.json`). Now `pnpm lint` = 0 errors across api/web/types. |
| Migrations | PARTIAL | 20 migrations versioned; `db:migrate:deploy` script added + used in integration CI. Prod deploy-time step lands with CD. |
| Env config | PARTIAL | Comprehensive `.env.example`; **no staging/prod separation** (lands with CD) |
| Caching/CDN | PARTIAL | Redis used (sessions/rate-limit/lockout); CDN "decided" (Cloudflare) but not set up |
| **CD / deployment** | **MISSING** | No Dockerfile, no host config; docker-compose is dev-only. Next step — Railway/Render per deployment decisions. |
| **Backups / recovery** | **MISSING** | No physical backup strategy; soft-deletes are app-level only (managed PG on Railway/Render provides this) |

---

## Explicitly PREMATURE — do NOT build pre-launch

- **Load balancing / autoscaling** (reel's "layer 11"): no traffic yet; building it now is over-engineering.
- **Multi-region / advanced CDN edge logic**: revisit post-launch under real load.
- **Idle-timeout, IP/UA session binding** (auth hardening extras): nice-to-have, not launch-blocking.

---

## Recommended order

1. **Bug-fix pass** (BUG-1..5) — small, high-value, independent of hosting. ~half a day.
2. **Hosting decision** (gates everything below) — where + budget + scale expectation.
3. **Ops hardening**: Helmet, real `/health` (db+redis), GlitchTip init, prod error-log NODE_ENV guard, PII redaction, reset-password throttle.
4. **CI pipeline**: GitHub Actions — lint + typecheck + test + build gating PRs to dev/main.
5. **CD + migrations runbook**: Dockerfiles (api + web), deploy workflow, migration-on-deploy step (manual-gate for prod per project rule), staging env.
6. **Backups**: automated Postgres backups + a tested restore.
