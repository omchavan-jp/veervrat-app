# Veervrat — Project Status, Decisions and Open Threads

**Read this first every session.** The register of what has been decided, what is still open,
and what order things happen in.

Moved into the repo (`ops/`) on 2026-08-16 — previously it lived in the untracked working
root, which meant every infrastructure decision had no history, no diff and no backup.

---

## Where things live

**Test:** *would a new engineer need it to build/run/deploy the app?* → `documentation/`.
*Is it about accounts, money, org contacts, decisions or process?* → `ops/` (here).

| File | Type | Contents |
|---|---|---|
| `ops/PROJECT-STATUS.md` (this) | durable | **The single register** — decisions (`D`) · open threads (`O`) · backlog (`B`) · inbox · working order · conventions |
| `ops/azure-account-facts.md` | durable | **What actually exists in Azure** — tenant/subscription IDs, deployed resources, access, guardrails, deployment traps |
| `ops/infra-budget-log.md` | durable | Running evidence base for the budget proposal owed to JP finance (B12) — *not* transient |
| `ops/triage-archive.md` | archive | Already-triaged history. Append-only, never actionable |

Merged on 2026-08-16: `backlog.md` folded into this file. Two registers had produced three
duplicated items, and duplication is how one copy gets closed while the other lingers.
The one-page product briefs were deleted — superseded by `spec/CONTEXT.md` and
`spec/decisions/01_user-roles.md`, and one of them had drifted into contradicting the spec.

Elsewhere in the repo: `documentation/` (engineering standards) · `spec/` (product decisions)
· `openspec/` (change workflow) · `DEPLOYMENT.md` (live runbook) · `CHANGELOG.md`

Still outside the repo, in the working root: `backups/` (DB dumps), `sahitya/` (source
material), and raw session transcripts. `analysis-output/` was deleted 2026-08-16 — its one
durable artifact (`DESIGN-LANGUAGE.md`) merged into `documentation/15_Design-System.md`; the
rest was a June audit whose remediation completed the next day, plus 3.4MB of HTML mockups of
a design the app now implements.

> 🔐 **Credentials never live here or anywhere in the repo.** Google OAuth client-secret JSONs
> were moved to `~/.secrets/veervrat/` (mode 600) on 2026-08-16, before this directory became
> git-tracked — they had been sitting loose in the working root. `.gitignore` also blocks
> `client_secret*.json` as a second line of defence. Rotation is tracked as O12.

---

## Current state (2026-08-16)

**UAT is LIVE on Azure, deployed by CD.** `/ready` green, schema migrated + seeded, web
serving. CD (GitHub OIDC → Azure, no stored secret) proven end-to-end on multiple real runs.

**Prod is now LIVE too.** First `prod-2026-08-16` tag deployed 2026-08-16 — promoted UAT's
exact image (`5576918`), no rebuild. `deploy-prod` succeeded on its first run — `/ready`
green, Postgres + Redis both up, schema migrated + seeded. Access is still effectively
closed: gating is env-var-only today (D20/O7), no capability grants exist for real testers
yet — that's B1, next. Data remains safe in Neon (12 users, 10 journeys) + a local dump —
**migration cancelled, see D19.**

| | |
|---|---|
| Cloud | **Azure**, Central India (Pune) — grant **US$2,000 / ₹1,91,300**, expires **2027-08-14** |
| Subscription | `veervrat` · `3ffcc513-dca6-453c-b9ff-83b096ea1381` |
| Spend | UAT ~$28/mo + prod stateful core ~similar → **~$55-60/mo for both**, once prod runs apps |
| Domain | `veervrat.jnanaprabodhini.org` — **finalised** (O2 closed 2026-08-16) + `veervrat.com` to buy defensively |
| UAT web | `https://veervrat-uat-web.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io` |
| UAT api | `https://veervrat-uat-api.proudcoast-d3aa08a0.centralindia.azurecontainerapps.io` |
| Terraform | `veervrat-app/infra/terraform/` — `envs/shared`, `envs/uat`, `envs/prod` all applied, plans clean |
| CD | `.github/workflows/cd.yml` — merge to `main` auto-deploys UAT; `prod-*` tag deploys prod (proven 2026-08-16, first run, no bugs) |
| Images | `veervratacr` — `veervrat-api`, `veervrat-api-migrate`, `veervrat-web`, built + cached in CI (GitHub Actions cache, not the registry) |
| DNS | zone exists; **NS delegation still pending with JP** (O1) — blocks custom domain, working chat, Resend |

`main` is the trunk; `dev` is retired. See `veervrat-app/AGENTS.md` → Git conventions.

📌 **Before deploying anything new, read the traps table in `azure-account-facts.md` §5.**
The first deploy hit seven distinct ones (Docker context bloat, arch mismatch, tag drift,
deploy-before-image, orphaned failed app, un-allow-listed Postgres extension, silently
dropped build args). Every one is now documented with its guard.

---

## ✅ Decisions made (do not relitigate)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Azure single cloud** + Terraform | Free-tier sprawl died with the trial; no IaC, no backups, 4 dashboards |
| D2 | **Central India** region | Compute was US-West, DB us-east-1, users in Maharashtra — huge needless latency |
| D3 | **Container Apps**, not self-run Kubernetes | It *is* AKS underneath; self-run adds 24/7 nodes, no scale-to-zero, YAML, on-call |
| D4 | **Zero VMs** anywhere | Owning an OS = patching + 24/7 billing |
| D5 | **Managed Postgres** (Flexible Server) | Containers have no durable disk; managed brings backups+PITR, closing the audit gap for ~$5/mo |
| D6 | **Managed Redis**, drop Upstash | Free under grant; self-hosted needs min-replicas=1 anyway, so same cost + ops |
| D7 | **Azure Blob**, drop R2 | Migration free today (0 files, 0 stored URLs); managed identity removes static keys |
| D8 | **Sentry free tier** (SDK already written) + **App Insights** for platform telemetry; **drop GlitchTip** | Different questions: "why did this fail" vs "is the system healthy". Both free. |
| D9 | **Resend** stays for email | Already coded; never use Google Workspace SMTP — risks JP's domain reputation |
| D10 | **Two deployed environments**: UAT + prod. Local docker-compose is "dev" | A third costs 3× for no user |
| D11 | **Beta testers live on PROD**, not UAT | ♻️ **Rationale replaced 2026-08-16.** The original reason ("otherwise you must migrate real personal data at launch") died with D19 — there is no data to migrate. The conclusion still holds, for a different and better reason: **UAT is the staging and approval environment**, where Nachiket reviews unreleased changes before they ship. Real beta users cannot live in an environment that is deliberately running unreviewed code. Confirmed in O7. |
| D20 | **Feature access is per-user data in the DB, not env vars** (2026-08-16) | A user can only be allowlisted *after* signing up, so an env allowlist costs a full deploy cycle per tester (signup → find UUID → edit Terraform → PR → CD → access). Managed instead through the admin dashboard. `CONTENT_EDITOR_USER_IDS` is deleted and content-editor access migrates to the same model — one mechanism, not two. **Env vars keep only environment-level toggles** (`CONTENT_EDIT_ENABLED=false` on prod, permanently, for everyone): "does this feature exist here" is config, "which users have it" is data. See B1. |
| D19 | **Neon migration CANCELLED** (2026-08-16) | Nachiket confirmed barely anyone started real work, and the dump agrees: 12 users and 10 journeys, but only 4 exposures / 3 resolutions / 1 challenge attached. The only non-reference data is 248 test answers and 15 feedback items — and the feedback is already captured in the inbox below. Prod will be created fresh and seeded, exactly as CD already does for UAT. Dump retained as an archive, not a migration source. |
| D12 | One subscription, environments split by **resource group** | Simpler; grant bills at account level anyway |
| D13 | **`veervrat.jnanaprabodhini.org`** over `veervrat.com` | Free, institutional identity. Moving later ≈ half a day + everyone logged out |
| D14 | Ask for **NS delegation**, not individual records | One request covers prod+UAT web/api and all future cert validation |
| D15 | Beta uses **firewall + TLS**; VNet + private endpoints **before public launch** | Private endpoints ~$7/mo each and harder to debug |
| D16 | **Om not tenant-wide Global Admin by default** → later scoped to subscription | (Global Admin *was* granted; revisit if JP moves M365 into the tenant) |
| D17 | No stakeholder dashboard — use **budget alerts + emailed invoices** | Built-ins don't go stale |
| D18 | Free tiers fine for now | ⚠️ **Resend's 3,000/mo ceiling is user-facing** (signups break); Sentry's is not |

---

## 🔴 Open threads

| # | Thread | Owner | Blocks |
|---|---|---|---|
| O6 | ✅ **CLOSED 2026-08-16** — single `main` trunk, UAT auto-deploys on merge, prod by `prod-*` tag promoting the same image. Documented in `veervrat-app/AGENTS.md` + `DEPLOYMENT.md`. Transition done — `main` fast-forwarded, `dev` retired | — | — |
| O18 | ✅ **CLOSED 2026-08-16** — CD pipeline live. GitHub↔Azure via OIDC (no stored secret), `.github/workflows/cd.yml` + `.github/actions/deploy-environment`. Parallel cached builds, per-job auth, migrate-before-deploy enforced. UAT **and now prod** deploys proven end-to-end — `deploy-prod` succeeded on its first run (`prod-2026-08-16`), the only CD path all the others' bug hunts hadn't yet touched (see `veervrat-app/documentation/21_Infrastructure-Conventions.md` §14–15) | — | — |
| O1 | **DNS delegation** — Azure zone created 2026-08-15, NS values sent; awaiting Shantanu | Om → **Rahul** → Shantanu | custom domain, chat fix, Resend |
| O2 | ✅ **CLOSED 2026-08-16** — `veervrat.jnanaprabodhini.org` finalised over `veervrat.com` | — | — |
| O3 | Buy `veervrat.com` defensively (~$10) | Om | — |
| O4 | Devavrat to **verify billing email** (shows "Not verified") | Devavrat | billing notifications |
| O5 | Add JP PAN/GSTIN to billing account (Tax ID empty) | Om → JP finance | invoice compliance |
| O7 | ✅ **CLOSED 2026-08-16** — **UAT:** feedback widget for all users, content editor for Nachiket (his content-review role). **Prod:** feedback widget for granted users only; **content editor never, for anyone**. Access is DB-backed and managed from the admin dashboard (D20), not env vars. Implementation is B1 | — | — |
| O8 | **Chat production-readiness** — own work packet. The gateway is competently built (auth on connect, rooms, sequence numbers, image upload) but **has never once run successfully in production** — the Next.js rewrite proxy blocked WebSocket upgrades from day one, so all real-world behaviour is unverified. Redis adapter now fixed; transport half needs the custom domain. Needs: reconnection, delivery guarantees, offline/unread, push notifications, UX review | later | scaling >1 replica |
| O9 | ✅ **CLOSED 2026-08-15** — Round 1 app fixes shipped (shutdown, distributed throttler, socket adapter, DB pool) | — | — |
| O10 | Terraform — **Phase 1 + 2A done, UAT app LIVE**. Phase 2B (prod) outstanding | Claude | prod |
| O15 | **Blob storage** — app speaks S3 (`@aws-sdk/client-s3`); Azure Blob does not. Needs an SDK swap before Blob can be provisioned | Claude | uploads (degrades gracefully meanwhile) |
| O16 | ✅ **CLOSED 2026-08-16** — migration job built + proven (`veervrat-uat-migrate`, build-stage image, manual trigger, `replica_retry_limit=0`) | — | — |
| O17 | **ACR purge task** — retention policies are Premium-only; on Basic use a scheduled `acr purge`. Needed once CD pushes an image per merge | Claude | registry cost |
| O11 | UAT data policy — seeded, never real users (per D11) | settled in principle | — |
| O12 | Rotate exposed secrets at cutover (PAT, session secret, R2 keys) | Om + Claude | cutover |
| O13 | Turn **off** root-scope Elevate access | Om (deferred by choice) | — |
| O14 | Budget→automation **hard stop** before public launch (MCA has no spending limit) | later | launch |

> **O-threads vs B-items.** An **O-thread** is scheduled work with an owner that blocks
> something. A **B-item** is noticed-but-unscheduled. When a B-item gets picked up it is
> *moved* to this table, not copied. Merging the two registers on 2026-08-16 removed three
> duplicates (ACR purge, chat readiness, feedback-widget environment) that existed in both.

---

## 🔄 In-flight OpenSpec changes

`openspec/changes/` — genuinely incomplete work, not process debt. Task counts verified
2026-08-16. Archived changes live in `openspec/changes/archive/` (36 of them).

| Change | Tasks | Note |
|---|---|---|
| `ui-ux-remediation` | 39/42 | closest to done |
| `my-vratmitras-chat` | 49/62 | the remainder is O8 — chat has never run in production |
| `prevent-duplicate-journeys` | 0/11 | proposed, not started |

`multi-instance-readiness` was archived 2026-08-16 at 35/35 — it had been left unarchived
after completion, which `documentation/04` §12 correctly calls a defect: half-finished process
state reads as ambiguous status to the next session.

---

## 📥 Backlog — noticed, not yet scheduled

Prioritised 2026-08-16. `B<n>` ids are local to this file and disappear when an item becomes
a GitHub Issue or is promoted to an O-thread above.

**p1 — blocks something, or is user-facing and live**

- **B1 + B9 (merged) · Per-user capability grants + admin dashboard management.**
  *Decided 2026-08-16 — supersedes the earlier "env allowlist now, UI later" plan.*

  **Why not env vars:** a user can only be allowlisted *after* they sign up, so each beta
  tester would cost signup → find UUID → edit Terraform → PR → CD deploy → access. A full
  deploy cycle per person. `CONTENT_EDITOR_USER_IDS` already demonstrates that pain.

  **The model — one mechanism, not two:**
  - **Per-user capability grants live in the DB**, managed through the admin dashboard.
  - **`CONTENT_EDITOR_USER_IDS` is deleted** and content-editor access migrates onto the same
    model. A full rewrite of gating that currently works — deliberate, not a workaround.
    Two access mechanisms side by side is the drift this exists to prevent.
  - **Env vars keep only environment-level toggles** — `CONTENT_EDIT_ENABLED=false` on prod
    permanently, for everyone. "Does this feature exist in this environment" is env config;
    "which users have it" is data.
  - `/auth/me` returns a coherent set of grants, not flags from two different sources.

  **Open design question for the proposal — capabilities vs roles.** Roles already exist
  (vratarthi, vratmitra, moderator, admin) and describe *domain identity*. A user can be a
  vratarthi **and** a beta tester **and** a content editor at once, so these read as
  capabilities rather than roles. Inclination is a separate grant concept over overloading
  the role enum — but settle it against the data model, don't assume.

  **Target behaviour:** feedback widget → all users on UAT, granted users on prod. Content
  editor → UAT only (Nachiket), never on prod for anyone.

  **Scope — the admin area is NOT greenfield.** 11 admin routes and audited APIs already
  exist. Full design applies to the *new* surface (grant model, API, user search + toggle UI,
  permission rows, audit events). Existing admin CRUD needs consistency, not redesign.
  ⚠️ If the known admin gaps come along — Deferral Ledger **#24** (taxonomy UI), **#25**
  (shloka tags / queue reorder), **#29** (Platform Stats dashboard) — **name them explicitly
  in the proposal.** Absorbed silently, they turn a bounded feature into an open-ended one.

  Settles O7. → needs-spec, OpenSpec full cycle

- **B1 (original note, retained for context) · Runtime-gate the feedback widget and content editor.** Both are gated by
  `NEXT_PUBLIC_*` flags, which Next.js **inlines into the browser bundle at build time** —
  colliding with "promote the same image, never rebuild". One image cannot show the widget in
  `test` mode on UAT and gated-to-selected-users on prod. **The pattern already exists**:
  `/auth/me` returns `isContentEditor`, driven by the `CONTENT_EDITOR_USER_IDS` allowlist; do
  the same for feedback. Target: **all users on UAT, selected users on prod.** Explicitly
  *not* the admin dashboard (B9) — env allowlist now, UI later. Also fixes
  `NEXT_PUBLIC_SITE_URL`, which would otherwise read `veervrat-uat-web…` on prod and break
  every link preview. Settles O7. → needs-spec
- **B2 · Rate-limit responses read as `INTERNAL_ERROR`.** A throttled request returns
  `{"statusCode":429,"error":"INTERNAL_ERROR","message":"ThrottlerException: Too Many
  Requests"}` — `http-exception.filter.ts` has no `ThrottlerException` case (verified: 0
  matches). Barely mattered while the auth overrides were detached; now that they genuinely
  enforce, real users hit this and see a generic internal error instead of "try again in 15
  minutes". Needs a proper error code + i18n message.

**p2 — real, not blocking**

- **B3 · Account lockout is unreachable from a single IP — confirmed, not theorised.**
  `14_Auth-Architecture-Decision.md` §16 specifies lockout after 10 failed logins per email;
  login is throttled at 10 req/15 min per IP. The throttler guard runs *before* the
  service-layer lockout check and both trip on the same count, so the documented
  `ACCOUNT_LOCKED` path never runs. Worked around **in the test only**
  (`auth.integration.spec.ts` resets the IP counter, not the lockout counter, before the
  final request) so lockout keeps coverage; **production still has the bug**. Also a product
  call: at 10/15 min per IP, vratarthi behind one school/office NAT throttle each other.
- **B4 · Expired sessions are never deleted.** Rows are removed only on logout; nothing
  deletes rows past `expiresAt` and there is no cron (verified: 0 matches). With a 30-day
  TTL, every session a user doesn't explicitly log out of stays forever — unbounded growth on
  the table read by **every authenticated request**. Indexes are fine (`token` `@unique`,
  `@@index([userId])`). Wants a daily `DELETE FROM sessions WHERE expires_at < now()`.
- **B6 · Verify `documentation/02_Local-Development-Setup.md` and adopt a freshness rule.**
  Last touched 2026-06-14 — before the Redis/throttler/shutdown work, the `.env.test`
  Redis-DB-1 split, and `DATABASE_POOL_MAX` / `SHUTDOWN_TIMEOUT_MS`. Nobody has run it on a
  clean machine since. ⚠️ A **competing set of setup commands** also existed at the bottom of
  the old `backlog.md` (now in `triage-archive.md` history) — reconcile, don't leave two.
  Wanted: (a) follow it from scratch and fix the drift, (b) add *"does this PR change how the
  app is set up or run locally?"* to the merge checklist in `20_Solo-Dev-Operations.md`.
- **B13 · Wire observability — Sentry + App Insights.** Decided in D8, **not implemented**.
  Current state: the Sentry SDK *is* installed and initialised (`apps/api/src/instrument.ts`)
  but reads **`GLITCHTIP_DSN`** (GlitchTip is Sentry-protocol-compatible, so the SDK was
  pointed at it). **App Insights is not wired at all** — no SDK, and no Terraform resource
  either; only Log Analytics exists, and that is for Container Apps logs. Work: rename
  `GLITCHTIP_DSN` → `SENTRY_DSN` (config, Joi schema, `.env.example`, Terraform app env),
  create the Sentry project and store the DSN in Key Vault, provision + wire App Insights.
  `18_Observability-Standard.md` now describes the target; this is the implementation.
  **Should land before beta testers reach prod** — until then there is no error tracking.

**p3 — worth doing, no deadline**

- ~~**B9 · Admin dashboard**~~ → **merged into B1** (2026-08-16). It was p3 on the assumption
  that B1 would ship an env-var stopgap first; once that was rejected, the dashboard *is* the
  mechanism, so it inherits B1's p1 priority. Issue #40 still tracks the wider admin vision.
- **B10 · Move the repo to a GitHub organisation.** `veer-vrat` is a **personal account**, so
  collaborators cannot be granted admin (only ownership transfer is offered). Also a
  continuity risk: JP's application is owned by one personal account. See B5 — an org on a
  paid plan would also unlock the process-enforcement features currently paywalled.
- **B11 · Restore IPv6 on the Mac.** Disabled 2026-08-16 to unblock Azure CLI, which hangs
  forever when IPv6 to `login.microsoftonline.com` is broken (no Happy-Eyeballs fallback).
  **Still in effect** and meant to be temporary: `sudo networksetup -setv6automatic Wi-Fi`.
- **B12 · Write the professional budget proposal for JP finance/seniors.** *Non-technical,
  but the task this entire infrastructure effort originally came from.* The grant discovery
  and the subdomain option redirected effort into building; the document was never written.
  Much easier now: `infra-budget-log.md` holds **actuals** (~$56/mo UAT + prod) plus the trail
  of what each option cost and why alternatives were rejected — including two estimates that
  turned out wrong. Should state the 2027-08-14 grant expiry and what happens after it, since
  that is what a reviewer will actually ask.

**❌ Blocked by plan limits — needs a decision, not effort**

- **B5 · Process enforcement is unavailable on GitHub Free + private repo.** Three separate
  paywalls hit: **required reviewers** on environments (422), **branch protection** on `main`
  (403 *"Upgrade to GitHub Pro or make this repository public"*), and **auto-merge**. So
  `main` deploys but cannot require green checks, and the prod gate is the tag alone.
  Options: upgrade to Pro/Team, make the repo public, move to an org (B10), or accept
  discipline-only enforcement. Until decided, **merging with green checks is a habit, not a
  rule** — this session used `--admin` repeatedly before the habit was adopted.

---

## 📨 Inbox — untriaged beta feedback

- **"Default vratmitra not seen"** — *"Default vratmitra असायला pahije"* (route
  `/journeys/4bf14bfe-…`, aaditya.hasabnis@gmail.com, 2026-07-21). Reads as a feature request:
  journeys should get a default/global vratmitra automatically. Needs scoping — missing
  onboarding behaviour, or a new ask?
- **"Platform Invite"** — *"What does sending platform invite to an email id do?"* (route
  `/invitations`, veervrat@jnanaprabodhini.org, 2026-07-24). The raw-email path (inviting
  someone not yet registered) still offers it with no explanation. Needs a one-line UI
  clarification, or an answer here first.

**Needs your input before it can be triaged**
- Weaknesses — order should change every 2–3 minutes; a "(i)" button or similar to read them
- Clarity: where is "my vratarthis" page, and what is "my vratmitras" page meant to be?
- Review PR of NN
- Not a dev task: update the list of beta users

History of already-triaged items: `triage-archive.md`.

---

## Working order

1. ✅ **Round 1 app fixes** (O9)
2. ✅ **Terraform Phase 1 + 2A** (O10) — shared + UAT infra
3. ✅ **Git/release conventions** (O6)
4. ✅ **Fast-forward `main` to `dev`, retire `dev`** — done
5. ✅ **First UAT deploy** — done 2026-08-16. Surfaced 7 traps (see `azure-account-facts.md` §5)
6. ✅ **CD pipeline** (O18) — done, proven end-to-end on UAT across several real runs
7. ✅ **Terraform Phase 2B (prod infra)** — stateful core provisioned, `plan` clean.
   **Paused here on purpose** — no apps deployed, no `prod-*` tag cut yet
8. ✅ **O7 settled** (D11's rationale replaced, D20 added) and ✅ **doc reorganisation done** —
   ops docs moved into the repo, the two registers merged, all 21 `documentation/` files read
   end to end with 12 staleness findings fixed, `AGENTS.md` made canonical
9. ✅ **First prod deploy** — `prod-2026-08-16` tag, `deploy-prod` succeeded on its first run
   (no bugs — every other CD path had one). `/ready` green, UAT untouched
10. **← next: B1** — per-user capability grants + admin dashboard, OpenSpec full cycle. Prod
    ships with the feedback widget effectively off until this lands, which is correct while
    there are no testers
11. **DNS cutover** (O1/O2) — parallel human track throughout; unblocks OAuth + Resend
12. Resend → Blob storage (O15) → decommission Neon/Upstash/R2

Rationale for 5-before-6: CD automates a deploy you understand. Written first, every
first-time deployment surprise surfaces as a red CI log instead of in front of you.

---

## When asking a question

Never a bare question or bare recommendation. Always include: the options considered
(including rejected ones), which way you lean and why, why *not* each alternative, and what
fact would change your mind. A recommendation without its alternatives is indistinguishable
from a guess. Full version in `veervrat-app/AGENTS.md`.

## Conventions

- **`main` is the trunk** (O6, 2026-08-16). Never commit directly — branch + PR always.
  `dev` is retired. Merging to `main` deploys UAT; prod ships by `prod-*` tag.
- Feature branches are **kept** after merge, never deleted
- Non-trivial features go through **OpenSpec** (`veervrat-app/openspec/`)
- Conventional commits
- **Never auto-migrate production** — manual approval gate

