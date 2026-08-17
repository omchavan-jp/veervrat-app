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

## Current state (2026-08-17)

**UAT is LIVE on Azure, deployed by CD.** `/ready` green, schema migrated + seeded, web
serving. CD (GitHub OIDC → Azure, no stored secret) proven end-to-end on multiple real runs.

**Prod is deployed but NOT usable — do not send anyone there yet.** First `prod-2026-08-16`
tag deployed 2026-08-16, `deploy-prod` succeeded on its first run, `/ready` green. But two
defects found 2026-08-17 mean no real user can use it:

- ✅ **O22 CLOSED** — prod's web tier now reaches **its own** api. Verified on prod after
  `prod-2026-08-17`: the served page names `api.veervrat.jnanaprabodhini.org`, the old proxy
  path returns 404, `og:url` names the prod domain.
- ✅ **Credential login works** — email delivers (B14), so signup → verify → login is a real
  path. Proven end to end on UAT 2026-08-17.
- 🔴 **O23** — Google OAuth still holds placeholder credentials in **both** environments. Not
  blocking (credential login works), but it is half the intended sign-in options.

Both were invisible to `/ready`, which checks each service in isolation and never asks whether
the tiers are wired to their own environment.

⚠️ **O23 now blocks verifying O22.** The cookie/CORS/CSRF changes can only be proven by a real
browser session, and there is no way to obtain one — the seed creates content but **zero
users**. That makes B14 (email) a *prerequisite* for closing O22, not a follow-up. See
`veervrat-app/documentation/21_Infrastructure-Conventions.md` §18.

The old Neon database still holds the only historical data (12 users, 10 journeys), plus a local
dump — **migration cancelled, see D19**; it is an archive, not a source.

| | |
|---|---|
| Cloud | **Azure**, Central India (Pune) — grant **US$2,000 / ₹1,91,300**, expires **2027-08-14** |
| Subscription | `veervrat` · `3ffcc513-dca6-453c-b9ff-83b096ea1381` |
| Spend | UAT ~$28/mo + prod stateful core ~similar → **~$55-60/mo for both**, once prod runs apps |
| Domain | `veervrat.jnanaprabodhini.org` — **finalised** (O2 closed 2026-08-16) + `veervrat.com` to buy defensively |
| UAT web | `https://uat.veervrat.jnanaprabodhini.org` |
| UAT api | `https://api.uat.veervrat.jnanaprabodhini.org` |
| Prod web | `https://veervrat.jnanaprabodhini.org` — 🔴 deployed, not usable (O22/O23) |
| Prod api | `https://api.veervrat.jnanaprabodhini.org` |
| Terraform | `veervrat-app/infra/terraform/` — `envs/shared`, `envs/uat`, `envs/prod` all applied, plans clean |
| CD | `.github/workflows/cd.yml` — merge to `main` auto-deploys UAT; `prod-*` tag deploys prod (proven 2026-08-16, first run, no bugs) |
| Images | `veervratacr` — `veervrat-api`, `veervrat-api-migrate`, `veervrat-web`, built + cached in CI (GitHub Actions cache, not the registry) |
| DNS | ✅ **live 2026-08-17** — 4 hostnames (web + api, UAT + prod) on `*.veervrat.jnanaprabodhini.org`, per-record via Shantanoo, managed TLS bound (O1/D14) |

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
| D9 | ~~Resend~~ → **JP's own SMTP relay** (flipped 2026-08-17) | Original reasoning ("Resend is already coded; never use Google Workspace SMTP — risks JP's domain reputation") was sound but its premise dissolved. JP IT provides a relay that sends as **`notifications.jnanaprabodhini.org`** — a purpose-built notifications subdomain, *not* JP's staff mail domain — so the reputation risk D9 was protecting against does not apply. What settled it: **credentials verified working end-to-end** 2026-08-17 (`235 Authentication successful`), and Shantanoo's own test mail landed in a **Gmail inbox, not spam** — real deliverability evidence, which no amount of config review provides. Also removes an external dependency, a third-party account, and Resend's 3,000/mo ceiling that D18 flagged as user-facing. Connection: `dhoomketu.in:587`, **STARTTLS** (`secure: false` + `requireTLS: true` in nodemailer — `secure: true` means implicit TLS on 465 and fails here). From: `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>`. Creds at `~/.secrets/veervrat/smtp-jp.env` (600, outside git), destined for Key Vault. Residual risk, accepted: deliverability reputation is now shared with other JP apps using that domain — smaller than the staff-mail risk, and not ours to control. Code swap is B14. |
| D10 | **Two deployed environments**: UAT + prod. Local docker-compose is "dev" | A third costs 3× for no user |
| D11 | **Beta testers live on PROD**, not UAT | ♻️ **Rationale replaced 2026-08-16.** The original reason ("otherwise you must migrate real personal data at launch") died with D19 — there is no data to migrate. The conclusion still holds, for a different and better reason: **UAT is the staging and approval environment**, where Nachiket reviews unreleased changes before they ship. Real beta users cannot live in an environment that is deliberately running unreviewed code. Confirmed in O7. |
| D20 | **Feature access is per-user data in the DB, not env vars** (2026-08-16) | A user can only be allowlisted *after* signing up, so an env allowlist costs a full deploy cycle per tester (signup → find UUID → edit Terraform → PR → CD → access). Managed instead through the admin dashboard. `CONTENT_EDITOR_USER_IDS` is deleted and content-editor access migrates to the same model — one mechanism, not two. **Env vars keep only environment-level toggles** (`CONTENT_EDIT_ENABLED=false` on prod, permanently, for everyone): "does this feature exist here" is config, "which users have it" is data. See B1. |
| D19 | **Neon migration CANCELLED** (2026-08-16) | Nachiket confirmed barely anyone started real work, and the dump agrees: 12 users and 10 journeys, but only 4 exposures / 3 resolutions / 1 challenge attached. The only non-reference data is 248 test answers and 15 feedback items — and the feedback is already captured in the inbox below. Prod will be created fresh and seeded, exactly as CD already does for UAT. Dump retained as an archive, not a migration source. |
| D12 | One subscription, environments split by **resource group** | Simpler; grant bills at account level anyway |
| D13 | **`veervrat.jnanaprabodhini.org`** over `veervrat.com` | Free, institutional identity. Moving later ≈ half a day + everyone logged out |
| D14 | ~~Ask for NS delegation~~ → **per-record instead** (revised 2026-08-16) | Met with Shantanoo: he offered to add individual records instead of delegating the whole subdomain, keeping JP's DNS control. ⚠️ **"Only 2 hostnames, api rides the proxy" was wrong** (corrected 2026-08-17) — see O1: api needs its own hostname too, to remove the proxy and fix chat/cookies. 8 records total (2 TXT + 2 CNAME × 4 hostnames: prod web, uat web, prod api, uat api), still all per-record, still no delegation. |
| D15 | Beta uses **firewall + TLS**; VNet + private endpoints **before public launch** | Private endpoints ~$7/mo each and harder to debug |
| D16 | **Om not tenant-wide Global Admin by default** → later scoped to subscription | (Global Admin *was* granted; revisit if JP moves M365 into the tenant) |
| D17 | No stakeholder dashboard — use **budget alerts + emailed invoices** | Built-ins don't go stale |
| D18 | Free tiers fine for now | ~~Resend's 3,000/mo ceiling is user-facing~~ — **no longer applies** (D9 flipped 2026-08-17; JP's relay has no such tier limit). Sentry's free tier remains, and is not user-facing. ⚠️ New watch item instead: JP's relay may impose its own rate limits — unknown, ask JP IT before any bulk send. |

---

## 🔴 Open threads

| # | Thread | Owner | Blocks |
|---|---|---|---|
| O6 | ✅ **CLOSED 2026-08-16** — single `main` trunk, UAT auto-deploys on merge, prod by `prod-*` tag promoting the same image. Documented in `veervrat-app/AGENTS.md` + `DEPLOYMENT.md`. Transition done — `main` fast-forwarded, `dev` retired | — | — |
| O18 | ✅ **CLOSED 2026-08-16** — CD pipeline live. GitHub↔Azure via OIDC (no stored secret), `.github/workflows/cd.yml` + `.github/actions/deploy-environment`. Parallel cached builds, per-job auth, migrate-before-deploy enforced. UAT **and now prod** deploys proven end-to-end — `deploy-prod` succeeded on its first run (`prod-2026-08-16`), the only CD path all the others' bug hunts hadn't yet touched. Also fixed same day: doc-only merges no longer trigger a pointless rebuild+redeploy — verified live with a real doc-only PR that skipped `build`/`deploy-uat` in 21s (see `veervrat-app/documentation/21_Infrastructure-Conventions.md` §14–16) | — | — |
| O1 | **DNS per-record, not delegation** (revised 2026-08-16, see D14). Met Shantanoo 2026-08-16 — the earlier Azure zone + NS-delegation request is superseded, he added records directly. **Web hostnames live and verified 2026-08-17**: `https://veervrat.jnanaprabodhini.org` (prod) and `https://uat.veervrat.jnanaprabodhini.org` (UAT), both serving real traffic with Azure-managed DigiCert TLS certs, hostnames bound `SniEnabled`. Caught and fixed same day: Shantanoo hit Azure's default 404 page hitting the domain — records were live, but the hostname wasn't yet bound to the Container App on our side (that step was always ours, not his). ⚠️ D14's original "only 2 hostnames are ever public" was wrong: `DEPLOYMENT.md`'s pre-existing DNS-cutover checklist (predates this thread) calls for **api hostnames too** (`api.veervrat.…`, `api.uat.veervrat.…`), specifically to enable same-site cookies and remove the Next.js rewrite proxy — the proxy is the documented reason WebSocket chat has never worked in production (O8). 4 more records requested from Shantanoo 2026-08-17; confirmed live same day, hostnames bound, managed certs issued — **all 4 hostnames now serve real traffic with valid TLS**: `veervrat.jnanaprabodhini.org`, `uat.veervrat.…`, `api.veervrat.…`, `api.uat.veervrat.…`. ✅ **DNS side closed.** Not yet done: the actual cookie/proxy-removal code change (`COOKIE_SAMESITE=lax`, drop the Next.js rewrite) — that's O8's work, a separate deliberate change, not a side effect of DNS landing. The now-unused Azure DNS zone (`veervrat.jnanaprabodhini.org`, `envs/shared/dns.tf`) is ready to decommission — see B15 | — | O8 (chat) |
| O22 | ✅ **CLOSED 2026-08-17** — prod's frontend was talking to UAT's backend. Found 2026-08-17, reproduced 3/3, while prod was live with `/ready` green on both tiers. `next.config.ts` reads `API_ORIGIN` at module scope; Next bakes `rewrites()` destinations into the build at **build time**, so the runtime env var Terraform sets on prod was silently ignored, and the promoted image kept UAT's value. Every prod request would have read/written **UAT's database**. Blast radius zero — prod had no users. Not one bad variable but a category error: **anything build-time cannot vary per environment under "promote, never rebuild"** — same root cause as the `NEXT_PUBLIC_SITE_URL` og-tag bug and the `NEXT_PUBLIC_FEEDBACK_MODE` problem behind B1. Written up as `documentation/21_Infrastructure-Conventions.md` §17. Fix is OpenSpec change `runtime-environment-config` (runtime config + drop the proxy + `SameSite=Lax` + CORS + a post-deploy wiring check); also unblocks O8's WebSocket transport | Claude | prod usable at all |
| O23 | **Google OAuth is not configured in EITHER environment** — `GOOGLE_CLIENT_ID`/`SECRET` are the literal Terraform default `placeholder-not-configured` (`modules/environment/variables.tf`) on UAT *and* prod, so the OAuth redirect reaches Google with a placeholder client id and fails. ⚠️ The callback URL also **changed** with the proxy removal — it is now on the api origin (`api.veervrat…`/`api.uat.veervrat…`), so that is what must be registered in the Google console. Combined with credential login throwing `EmailNotVerifiedException` (`auth.service.ts:148`) while email is unwired, **there is currently no way for anyone to sign up or log in on prod, by any path.** Needs a Google console entry for the prod callback URL (external dependency — start early) and real secrets into Key Vault. Sequenced after `runtime-environment-config`, because the callback URL changes when the proxy is removed | Om + Claude | any prod login |
| O21 | ✅ **CLOSED 2026-08-17** — email goes through JP's SMTP relay, not Resend (**D9 flipped**), **implemented and delivering** (B14 — a real message reached an external Gmail inbox, not spam). Every open question answered: sends as `notifications.jnanaprabodhini.org` (dedicated notifications subdomain, not staff mail — which is what resolved the D9 reputation concern); credentials received and **verified authenticating** (`235`); Shantanoo's test mail reached a Gmail **inbox, not spam**. Mailbox is `do-not-reply-veervrat@` (his naming, already provisioned — we adopt it, not the `noreply-` I'd suggested). Creds stored at `~/.secrets/veervrat/smtp-jp.env` (600, outside git). Remaining work is code only: B14 | — | — |
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
  `NEXT_PUBLIC_SITE_URL` reading `veervrat-uat-web…` on prod — **confirmed live 2026-08-17**
  once the custom domain went up: prod's `og:url`/`og:image` still point at UAT's internal
  hostname, so every link preview is currently wrong. Was a prediction, now a fact. Settles
  O7. → needs-spec
- **B2 · Rate-limit responses read as `INTERNAL_ERROR`.** A throttled request returns
  `{"statusCode":429,"error":"INTERNAL_ERROR","message":"ThrottlerException: Too Many
  Requests"}` — `http-exception.filter.ts` has no `ThrottlerException` case (verified: 0
  matches). Barely mattered while the auth overrides were detached; now that they genuinely
  enforce, real users hit this and see a generic internal error instead of "try again in 15
  minutes". Needs a proper error code + i18n message.

**p2 — real, not blocking**

- **B16 · An unverified account is a permanent dead end — three ways in, no way out.** p1-ish.
  Login refuses any address with `emailVerifiedAt` null (`auth.service.ts` →
  `EmailNotVerifiedException`), and **nothing else in the system ever sets it**:
  1. `resetPassword` only updates the password hash. Reset succeeds; login still refuses.
  2. `linkGoogleAccount` verifies the user's password and issues a session but does not set it
     either — so **Google has proven ownership of the address, Google sign-in works, and
     credential sign-in on the very same account still says "verify your email"**. Hit for real
     2026-08-18.
  3. There is **no resend-verification endpoint** (`auth.controller.ts` has only
     `forgot-password` and `verify-email`), so a lost verification mail is unrecoverable.

  Each of (1) and (2) proves control of the mailbox at least as well as clicking a verification
  link, so both should mark the address verified; (3) should exist regardless. The UI also
  explains none of this — it just refuses. Any beta tester who misses one email lands here.
- **B17 · No way to administer data in a deployed environment.** There is no admin user (the
  seed creates content only), no `az containerapp exec` runbook, and Postgres allows only
  "Azure services" through its firewall — so removing a test account or fixing a row on UAT has
  no supported path. Fine while environments are disposable; not fine once real beta users
  exist and someone needs a correction made. Wants either a documented break-glass procedure or
  the admin surface from B1.


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

- **B14 · Swap `email.service.ts` from Resend's API to JP's SMTP relay.** ✅ Unblocked —
  **D9 flipped, creds verified authenticating** 2026-08-17 (O21). Replace the `resend` SDK call
  with nodemailer; React Email template rendering is unaffected (it produces HTML either way).
  ⚠️ **STARTTLS, not implicit TLS**: `{ secure: false, requireTLS: true }` on port 587 —
  `secure: true` means port-465 implicit TLS and fails against this server. Also: drop the
  `resend` dependency, rename `RESEND_API_KEY` → the `SMTP_*` set in config + Joi schema +
  `.env.example`, put the password in **Key Vault per environment** (currently only in
  `~/.secrets/veervrat/smtp-jp.env`), and set `EMAIL_FROM` to
  `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>`. **Gates credential
  signup** — `auth.service.ts:148` throws `EmailNotVerifiedException`, so without delivery no
  credential user can ever log in. Ask JP IT about relay rate limits before any bulk send.
- **B15 · Decommission the unused Azure DNS zone.** Created for the NS-delegation plan that
  D14 superseded 2026-08-16 (per-record instead). `envs/shared/dns.tf`, `prevent_destroy =
  true` — removing it is a deliberate `terraform destroy -target` + lifecycle override, not
  a drive-by. Deferred until the per-record DNS (O1) is confirmed live, so there's no window
  with neither the old nor the new DNS path working.

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
10. ✅ **Custom domains live** (O1) — all 4 hostnames bound with managed TLS, 2026-08-17
11. ✅ **`runtime-environment-config`** (O22) — built, merged, **live on UAT**. Runtime config,
    proxy removed, `SameSite=Lax`, CORS on the custom domain, plus a CD check that asserts
    cross-tier wiring. Everything machine-verifiable passes. **Prod tag deliberately not cut**
    — the browser checks are the gate and they are blocked, see 12
12. ✅ **B14 done** (O21) — nodemailer over JP's relay. **Verified by a real delivered email**
    2026-08-17: reached an external Gmail inbox, not spam, which also proved the relay sends
    outside JP's own domain (never previously tested). ⚠️ Prod's Key Vault still holds the
    placeholder SMTP password — set it before the next prod deploy
13. ✅ **Signup → verify → login proven on UAT**, and **`prod-2026-08-17` shipped**. Completing
    onboarding (display name, username, gender, DOB) exercised several state-changing writes
    across hosts, so CSRF double-submit and credentialed CORS are verified against the new
    architecture. Prod redeployed and confirmed pointing at its own api.
    ⚠️ Still unverified: session persistence across a **reload**, **logout**, and whether
    **prod** can actually send email (its config matches UAT and the real password is in its
    Key Vault, but no message has been sent from prod — deliberately, since B17 means a test
    account on prod cannot be deleted)
14. **Then prod Google OAuth** (O23) — real client id/secret. ⚠️ Register the **api-origin**
    callback URL, not the web origin; it moved when the proxy was removed
15. **Then B1** — per-user capability grants + admin dashboard, OpenSpec full cycle. Only
    meaningful once people can actually log in (12–14)
16. Blob storage (O15) → decommission Neon/Upstash/R2 → budget proposal (B12, owed to JP
    finance — not blocking, but a human commitment that silently slips)

Rationale for 5-before-6: CD automates a deploy you understand. Written first, every
first-time deployment surprise surfaces as a red CI log instead of in front of you.

Rationale for 11-before-everything: it is the only item that makes prod *wrong* rather than
*incomplete*. A user reaching prod today would have their data written to UAT.

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



# manual entries section to integrate properly into above backlog

in signup page username checks 
- what chars are allowed/not alowed isn't displayed
- when i enter invalid, endpoint response is 
{"data":{"available":false,"reason":"invalid"}}
but error message displayed is "Username already taken"

----

After verifying email, during first sign in, it takes me to Step 1 of 2
Set up your account page, there i again get option to change display name and username (though both were filled during sign up) - proper ux (like just prefill as non immutable or what) discussion required.

----

in step 2 (onboarding) - "take me to test" button still took me to dashboard.

