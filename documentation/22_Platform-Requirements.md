# Platform Requirements

**What Veervrat needs in order to run, stated independently of any hosting provider.**

Written for someone deciding *where* to host the application, or *what to buy* — a hosting
evaluation, a cost estimate, a migration plan, or a new deployment. It describes the
application's needs, not any particular deployment of it.

Two distinctions run through the document, and confusing either produces wrong answers:

- **Required by the application** vs **currently provisioned.** A feature that is built but
  unprovisioned still has requirements. Sizing a platform from whatever happens to be running at
  the time would omit them.
- **Measured** vs **estimated.** Load figures are estimates. Section 9 says exactly which, and
  what to measure to replace them.

---

## 1. Components

| Component | Required by the app | Provisioned in the current deployment | If absent |
|---|---|---|---|
| PostgreSQL 18 | **Yes** | Yes | Nothing works — sole source of truth |
| Redis | **Yes above one instance** (§4) | Yes | Rate limiting and chat degrade silently |
| Container runtime, 2 services | **Yes** | Yes | — |
| One-off job runner | **Yes** | Yes | Schema migrations and seeding cannot run |
| Object storage | **Yes** | **No** | Avatar and image uploads fail. The feature is built |
| Outbound SMTP | **Yes** | Yes | Signup verification and password reset fail; unverified accounts cannot sign in |
| TLS termination | **Yes** | Yes | Session cookies require HTTPS; so does OAuth |
| DNS | **Yes** | Yes | — |
| Secret storage | **Yes** | Yes | — |
| Log aggregation | **Yes** | Yes | Job output is the only evidence a migration performed work |
| Full-text search engine | **Yes** | **No** | Search silently returns empty results. The feature is built |

Two rows matter most when comparing providers: **object storage and search are required by the
application and absent from the current deployment.** Any sizing or costing exercise must include
them.

---

## 2. Database

| Requirement | Value |
|---|---|
| Engine | PostgreSQL, major version 18 |
| Extension | `pg_trgm` (trigram indexes for entity search) |
| Storage | 32 GB provisioned, growable *(estimated)* |
| Concurrent connections | ≥ 25. Pool size × service instances + migration and administrative headroom |
| Encryption in transit | Required |
| Data residency | **India** — a legal requirement, not a preference (§8) |
| Recovery point objective | ≤ 5 minutes of data loss |
| Recovery time objective | ≤ 1 hour to a serving database |
| Backup retention | 35 days production, 7 days pre-production |
| Backup storage | Additional to primary storage, and usually billed separately |

**Point-in-time recovery is required** — the ability to restore to any chosen moment within the
retention window, not merely to the most recent nightly snapshot. The recovery objectives above
assume it.

⚠️ **Check `pg_trgm` availability before selecting a provider.** Managed PostgreSQL services
frequently restrict `CREATE EXTENSION` to a provider-controlled allow-list, and database
administrator rights are not sufficient to override it. A migration that fails partway through
leaves a partially applied schema, which is materially harder to recover from than a clean
failure.

⚠️ **Disk throughput and IOPS matter more than vCPU count for this workload.** Two plans with
identical CPU and memory can differ severalfold in database performance. Where a provider
publishes IOPS separately, treat it as a primary selection criterion.

---

## 3. Application services

Two long-running HTTP services, both Node.js 24, **amd64**:

| Service | Listens on | CPU | Memory | Instances |
|---|---|---|---|---|
| API (NestJS) | 3001 | 0.25 vCPU | 512 MiB | 1–2 |
| Web (Next.js) | 3000 | 0.25 vCPU | 512 MiB | 1–2 |

*(Sizing estimated — see §9.)*

**Architecture is not incidental.** Images are built for amd64. An arm64 host requires either a
rebuild or emulation; a mismatched image fails at start with an error resembling file corruption
rather than an architecture problem.

**Graceful shutdown:** services drain in-flight requests for up to 10 seconds on `SIGTERM`. The
platform's termination grace period must exceed that, or deployments drop requests that were
already accepted.

**Health checks:** two endpoints, deliberately different.
- A liveness endpoint, intentionally cheap, so it does not fail during a transient database
  interruption and trigger an unnecessary restart.
- A readiness endpoint that verifies database and cache connectivity.

⚠️ Neither verifies that the database **schema** is present. A platform's own health reporting
therefore cannot be treated as proof the application is functional; that requires exercising a
real read or write path.

---

## 4. Cache

Redis-compatible, with:

- eviction policy `allkeys-lru` — contents are reconstructible, so eviction is safe
- encryption in transit
- no persistence required
- no high availability required at current scale

**Redis is mandatory when running more than one instance of the API.** Below that it may be
omitted, with two consequences:

1. **Rate limiting becomes per-process.** With multiple instances the effective limit multiplies
   by instance count. This is a security control, and it weakens without producing an error.
2. **WebSocket messaging loses its shared backplane.** Chat messages reach only clients connected
   to the same instance.

Both conditions are logged as warnings and the application continues to run. Treat Redis as
required for any multi-instance deployment.

---

## 5. One-off jobs

Schema migration, reference-data seeding, and administrator bootstrap run as jobs that execute
once and exit — never on a schedule, never automatically as part of application startup.

| Job | CPU | Memory | Timeout |
|---|---|---|---|
| Schema migration | 0.5 vCPU | 1 GiB | 15 min |
| Reference-data seed | 0.5 vCPU | 1 GiB | 30 min |
| Administrator bootstrap | 0.5 vCPU | 1 GiB | 5 min |

⚠️ **Jobs run a different image from the serving image.** They require the database migration
tool and a TypeScript runtime, both of which are development dependencies removed from the
runtime image to keep it small. **A platform that cannot run a one-off task on an image other
than the deployed one cannot perform migrations.** This constraint is easy to miss when comparing
platforms, and expensive to discover afterwards.

**Job output must be retrievable after the job exits.** A migration's own output is the only
evidence that it did anything: a job can exit successfully having performed no work, and without
its logs that is indistinguishable from success.

---

## 6. Object storage

Required by the application; built (#139), not yet deployed as of 2026-08-24.

- User-uploaded avatars and images
- Private by default, served through the application rather than public bucket URLs
- Volume: unknown — no basis for an estimate (§9)

The storage protocol is an implementation detail of the application and is subject to change;
it should not constrain platform selection. Any durable object store with an access-controlled
API is suitable — enforced by a `StorageProvider` interface the upload service depends on
rather than any SDK directly.

⚠️ **The implementation does not currently meet the "private by default" requirement above.**
Both providers (Azure Blob and the pre-existing S3/MinIO one) return a plain, unsigned, publicly
readable URL — matching the S3/MinIO behaviour this application already had before #139, which
that work deliberately preserved rather than changed. `StorageProvider.signedUrl()` exists and is
implemented on both providers, so private-by-default is a config change (container/bucket access
policy) plus a caller that uses `signedUrl()` instead of the URL `put()` returns — not a
rewrite — but nobody has decided to make that change, or confirmed whether "private by default"
here still reflects what the product should do. Flagged rather than resolved either way.

---

## 7. Search

Required by the application; not currently provisioned.

A full-text search engine indexing user, content and entity records. When absent, search
endpoints return empty results and log a warning rather than failing — so its absence is easy to
overlook, and looks to a user like "nothing found" rather than "search is unavailable".

---

## 8. Services outside the hosting platform

These do not run on the hosting provider, and therefore do not move when the hosting provider
changes.

| Service | Requirement | Indicative cost if separately procured |
|---|---|---|
| Outbound SMTP | Submission on port 587 with STARTTLS, authenticated, sending from a dedicated notifications subdomain | $10–20/month at this volume |
| DNS | Ability to publish records for four hostnames | $10–15/year for an owned domain |
| OAuth (Google) | One client per environment; callback URLs registered against the API hostname | No cost |

⚠️ **Port 587 uses STARTTLS, not implicit TLS.** Configuring implicit TLS (port 465 behaviour) on
port 587 fails during the handshake with an error that does not identify the cause.

**Data residency:** application data must remain in India. This constrains region selection for
any provider and applies to backups as well as primary storage.

---

## 9. Capacity — estimated, not measured

**The application has never run under real user load.** Every figure below is an estimate derived
from configured sizes, not from observation. Quoting them as measurements would be inaccurate.

Current configured sizing supports, at a rough estimate: tens of concurrent users, low tens of
requests per second, and a database well under 1 GB.

**Measure the following once the application carries real traffic, then revise this section:**

| Measure | Determines |
|---|---|
| Peak concurrent users | Instance count |
| Requests per second at peak | CPU sizing |
| 95th-percentile response time when warm | Whether 0.25 vCPU per service is sufficient |
| Database size growth per active user | Storage sizing and cost projection |
| Peak concurrent database connections | Connection pool and instance limits |
| Monthly egress volume | The metered line item on most plans, and the one most often capped |
| Object storage growth | Storage tier and cost |
| Disk read/write throughput at peak | Whether the plan's IOPS allocation is adequate |

Until these exist, capacity discussions should quote the configured sizing **and state that it
has not been observed under load.**

---

## 10. Platform capabilities

Stated as capabilities rather than products, since several platform types satisfy them.

The platform must be able to:

1. Run two long-lived HTTP services with independent scaling
2. **Run a one-off task on a different image from the deployed one** (§5)
3. Promote a single built image between environments **without rebuilding it** — configuration
   that differs per environment must be supplied at runtime, never at build time
4. Inject configuration and secrets at start, without embedding them in the image or source
5. Roll out a new version with a readiness gate, so traffic shifts only after the new version
   reports healthy
6. Retain and expose logs from both services and one-off jobs after they exit
7. Terminate TLS and route by hostname
8. Provide, or permit, an outbound source address stable enough to be allow-listed if a
   dependency later requires it

Requirement 3 is the most consequential and the least visible. Because one image serves every
environment, any value fixed at build time is identical everywhere it runs — so environment
URLs, feature switches and per-environment behaviour must be resolved at runtime.

**Platform types that satisfy these:**

| Type | Assessment |
|---|---|
| Container-as-a-service (managed) | Satisfies all of the above directly. Current deployment model |
| **A single virtual private server with Docker Compose** | **Satisfies all of the above at current scale.** Rolling deploys and log retention require modest scripting. The most economical option, and adequate |
| Managed Kubernetes | Satisfies all of the above, and is disproportionate at this scale — its operational overhead exceeds the application's needs |
| Platform-as-a-service | Usually satisfies 1, 3, 4, 5, 7. **Verify requirement 2** — one-off tasks on a separate image are frequently unsupported, which precludes migrations |

Kubernetes is not required. Two services, three occasional jobs, and a database do not warrant
it, and adopting it would add an operational surface larger than the application itself.

---

## 11. Non-negotiable constraints

- PostgreSQL 18 with `pg_trgm`
- Node.js 24, amd64
- HTTPS on every hostname
- One image promoted across environments; nothing environment-specific fixed at build time
- One-off jobs must be able to run an image other than the deployed one
- **Web and API hostnames must share a registrable parent domain.** Session cookies are scoped to
  that shared parent; hosting them on unrelated domains prevents the browser from returning the
  cookie, and authentication will not persist across page loads. This constrains the hostname
  layout, not merely the certificate.
- Application data, including backups, must remain in India
