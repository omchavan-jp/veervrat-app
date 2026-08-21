# Platform Requirements

**What Veervrat needs to run, stated without reference to any provider.**

This document exists so the app's requirements are written **once**. Three documents consume it
and would otherwise each restate it — and drift:

```
                  THIS DOCUMENT (what the app needs)
                   /            |              \
    Azure-from-nothing   VPS-from-nothing   Budget / costed options
                   \            /
                     Migration doc
```

It is also the direct answer to *"how much CPU, RAM, storage, bandwidth and concurrency would we
need elsewhere?"* — a requirements question, not a deployment one.

⚠️ **Sizing below is largely ESTIMATED, not measured.** The platform has zero real users, so
there is no concurrency, bandwidth or growth data. Every number is labelled. See §8 — do not let
these estimates be quoted back as facts.

---

## 1. Components that must exist

| # | Component | Required? | What breaks without it |
|---|---|---|---|
| 1 | **PostgreSQL 18** | **Yes** | Everything. Sole source of truth |
| 2 | **Redis** | **Yes above one replica** | See §3 — the app boots, and two guarantees silently weaken |
| 3 | **Container runtime**, 2 long-running services | **Yes** | — |
| 4 | **One-off job runner** | **Yes** | Migrations, seeding, admin bootstrap cannot run |
| 5 | **Object storage** | Not yet | Uploads. None exist today |
| 6 | **Outbound SMTP** | **Yes** | Signup verification, password reset — an unverified account cannot log in |
| 7 | **TLS termination + DNS** | **Yes** | Cookies are `Secure`; OAuth callbacks are HTTPS |
| 8 | **Secret storage** | **Yes** | Connection strings, session secret, SMTP and OAuth secrets |
| 9 | **Log aggregation** | **Yes, in practice** | Job output is the only evidence a migration ran (conventions §21) |
| 10 | **Search (Meilisearch)** | **No** | Search returns empty results, logged as a warning. Not deployed today |

---

## 2. PostgreSQL

| | |
|---|---|
| Version | **18** — not negotiable without testing. Chosen to match the Neon source data |
| Extensions | **`pg_trgm`** — required by `20260614090133_add_trgm_entity_search_indexes` |
| Storage | 32 GB provisioned, auto-grow on. *(Estimate — current usage is a seeded dataset plus 6 test accounts)* |
| Connections | `DATABASE_POOL_MAX × max_replicas + headroom` must stay under `max_connections`. Today: 5 × 2 = 10 + migration/admin |
| Backups | PITR. Prod 35 days, UAT 7. **Restore rehearsed** — see `DEPLOYMENT.md` |
| TLS | Required (`sslmode=require`) |

⚠️ **`pg_trgm` is the portability trap.** Managed Postgres often gates `CREATE EXTENSION` behind a
provider allow-list — being database admin is not enough. On Azure this is the `azure.extensions`
server parameter. **Check this before choosing any provider**; a migration that fails halfway
leaves a half-applied schema.

Current reference: Azure Flexible Server, `B_Standard_B1ms` (1 vCore burstable, 2 GB RAM).

## 3. Redis — "optional" is misleading

`REDIS_URL` is optional in config and the app boots without it. **Two things silently degrade:**

- **Rate limiting becomes per-process** (`throttler-config.factory.ts`). With more than one
  replica the effective limit multiplies by replica count. This is a **security control**, and it
  weakens without failing.
- **Socket.IO falls back to an in-memory adapter** (`main.ts`). Chat breaks across replicas —
  messages reach only clients on the same instance.

Both log a warning and continue. **So: single replica → Redis optional. More than one replica →
Redis required.** Anyone sizing a cheaper platform needs that sentence, because "Redis is
optional" reads like a saving and is a correctness cliff.

Requirements: eviction `allkeys-lru` (contents are reconstructible — sessions live in Postgres),
TLS, no persistence needed, no HA at beta scale.
Current reference: Azure Managed Redis `Balanced_B0`, no HA.

## 4. Compute

**Two long-running services**, both Node 24:

| Service | Port | CPU | Memory | Replicas |
|---|---|---|---|---|
| `api` (NestJS) | 3001 | 0.25 vCPU | 0.5 GiB | 1–2 |
| `web` (Next.js) | 3000 | 0.25 vCPU | 0.5 GiB | 1–2 |

*(Measured only in the sense that the app runs comfortably at this size with no load. Under real
traffic these are guesses.)*

**One-off jobs** — 0.5 vCPU / 1 GiB, run to completion, never on a schedule:
migrate (15 min timeout), seed (30 min), grant-admin (5 min).

⚠️ Jobs run the **build-stage** image, not the runtime image: they need the `prisma` CLI and
`ts-node`, which are devDependencies pruned from runtime. Any platform must be able to run a
*different image* from the serving one, or the migration story breaks.

**Graceful shutdown:** the app drains in-flight requests for up to 10s (`SHUTDOWN_TIMEOUT_MS`).
The platform's SIGTERM→SIGKILL grace period must exceed that, or deploys drop requests.

**Health:** `/health` is deliberately cheap so it does not flap on a transient DB blip. `/ready`
pings Postgres and Redis. ⚠️ Neither checks the **schema** — prod once served 200 on both with an
empty database for five days (conventions §21).

## 5. Object storage

Not provisioned; no files exist. Azure Blob is the decided direction (O15), requiring an SDK swap
from `@aws-sdk/client-s3` to `@azure/storage-blob`.

**Portability note for sizing, not a recommendation:** today the app speaks the S3 protocol, so
storage is not part of a migration. After the Blob swap it becomes part of one. Either is
workable; the migration estimate differs.

Growth: unknown. Avatars and chat images. *(No basis for an estimate — see §8.)*

## 6. External services — not infrastructure, and not portable in the same way

| | Current | If replaced |
|---|---|---|
| **SMTP** | JP IT relay, `:587` STARTTLS, sending as a dedicated notifications subdomain | ~$10–20/mo transactional provider |
| **DNS** | Subdomain of JP's domain, records added by JP IT per-record | ~$10–15/yr for an owned domain |
| **Google OAuth** | One client **per environment**, callback on the **api** origin | Portable; callbacks must be re-registered |

⚠️ `SMTP_SECURE=false` is correct for port 587 (STARTTLS). `true` means implicit TLS on 465 and
fails with an error that does not name the cause.

**None of these three run on Azure.** They survive a cloud migration untouched — an asset — and
they are organisational dependencies on JP IT rather than technical ones.

## 7. Operational requirements a platform must support

Not optional extras — the deployment story depends on each:

1. **Run a one-off job on a different image than the serving one** (§4)
2. **Promote one image between environments without rebuilding.** Anything baked at build time
   cannot vary per environment — this has caused three separate defects (conventions §17)
3. **Per-environment runtime configuration**, injected at start
4. **Secret injection** without secrets entering the image or the repo
5. **Retrievable job logs.** A migration's own output is the only proof it ran
6. **Zero-downtime revision rollout** with a readiness gate
7. **Point-in-time database restore** — and note it may produce a *new* server, requiring the app
   to be re-pointed

## 8. What is estimated, and what to measure when testers arrive

**Everything about load is a guess.** With zero users there is no honest alternative — but the
guess must be labelled, or it becomes a fact by repetition. That failure has already happened
three times on this project.

Measure once real testers are on prod, then revise this document:

| Measure | Why | How |
|---|---|---|
| Peak concurrent users | Replica count, connection pool | App Insights / access logs |
| Requests/sec at peak | CPU sizing | Same |
| p95 latency, warm | Whether 0.25 vCPU holds | `/ready` timing |
| DB size growth per active user | Storage sizing and cost | `pg_database_size` over time |
| Egress GB/month | The line item cheap VPS plans cap | Provider metering |
| Object storage growth | Storage tier | Bucket size |
| Peak DB connections | Whether pool × replicas is right | `pg_stat_activity` |

**Until then, sizing conversations should quote the current configuration and state plainly that
it has never been under load.**

## 9. Constraints that are not negotiable

- **PostgreSQL 18 with `pg_trgm`** — check provider support before committing
- **Node 24**
- **One image promoted across environments** — the basis of the whole deployment model
- **The job runner must accept a different image**
- **HTTPS everywhere** — cookies are `Secure`; OAuth requires it
- **Cookies must be scoped to a registrable domain** shared by web and api, or login does not
  survive a refresh. This dictates the hostname layout, not just the certificate

---

Related: `DEPLOYMENT.md` (the Azure instantiation), `documentation/21_Infrastructure-Conventions.md`
(why the constraints exist), `ops/infra-budget-log.md` (costs), `ops/data-map.md` (what data this
platform holds).
