# Veervrat — Project Status, Decisions and Open Threads

**Read this first every session.** The register of what has been decided, what is still open,
and what order things happen in.

Moved into the repo (`ops/`) on 2026-08-16 — previously it lived in the untracked working
root, which meant every infrastructure decision had no history, no diff and no backup.

---

## ⚠️ Audit, 2026-08-27 — read `ops/audit/README.md`

Five passes over the whole product. The diagnosis is narrow and it holds in every case: **the
backend was built, tested and correct, and the thing a person touches was missing, inert, or
pointed somewhere useless.** The working definition of *done* had become "the API can do it".

Eight defects fixed, including three that made core flows impossible: nobody could accept a
vratmitra invitation, nobody invited by email could ever accept, and removing a vratmitra did not
stop them reading your journeys.

**Five things need you, not me** — full list in `ops/audit/README.md`:

1. ~~🔴 **O18** — password in git history~~ → rotated, O24 closed 2026-08-27.
2. ~~🔴 **#217** — data export has no UI~~ → implemented, PR #233 merged, #217 closed 2026-08-27.
3. Ratify or overrule: accepting an invitation now makes someone a vratmitra **self-service**.
4. Decide notification destinations (#218) and whether the two deep-link maps should agree.
5. ~~Decide whether `ENDED` joins `VmRelationshipState`~~ → implemented, PR #233 merged 2026-08-27.

---

## Where things live

**Test:** *would a new engineer need it to build/run/deploy the app?* → `documentation/`.
*Is it about accounts, money, org contacts, decisions or process?* → `ops/` (here).

| File | Type | Contents |
|---|---|---|
| `ops/PROJECT-STATUS.md` (this) | durable | Decisions (`D`) · open threads (`O`) · inbox · **working order** · conventions. **Not the backlog** — that is GitHub Issues |
| GitHub Issues | live | **The backlog.** `gh issue list`. Priority by `p0`–`p3` label; sequence lives in Working order here |
| `ops/azure-account-facts.md` | durable | **What actually exists in Azure** — tenant/subscription IDs, deployed resources, access, guardrails, deployment traps |
| `ops/infra-budget-log.md` | durable | Running evidence base for the budget proposal owed to JP finance (#84) — *not* transient |
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

## Current state (2026-08-27)

**Both environments are live, correctly wired, signed into, and — as of today — actually
usable.** Prod was none of those last things until 2026-08-21, while appearing to be all of
them.

- **UAT** — deployed by CD on every merge. Signup → verification email → verify → login proven
  end to end, plus Google sign-in.
- **Prod** — live since `prod-2026-08-17`, but its **database had no schema at all** until
  2026-08-21. Not a missing migration: no tables, while `/health` and `/ready` both returned
  200. Every signup returned 500. Fixed, seeded, and verified by a real signup, a real
  verification email, a password reset and a login that survived a refresh.

**What today changed, and why it matters beyond today:**

- **#112** — the migration job had never applied a migration in *any* environment. CD started it
  with `--image`, which replaces the whole container spec, so it ran the image's default
  entrypoint with no `DATABASE_URL`, did nothing, and exited 0 → recorded **Succeeded**. Three
  such "successful" migrations. CD now requires prisma's own output before accepting one.
- **#113** — overridden job executions also produce **no retrievable logs**, so an override
  removes the evidence that would reveal it misbehaved. No per-execution overrides, ever.
- **#114** — every environment shipped a complete admin dashboard nobody could open. There is
  now a deliberate, audited way to grant the first administrator.
- **#88 closed** — prod email confirmed *delivered*, not merely configured.

**The pattern worth carrying forward:** three separate failures this week — the migration job,
a PR merged to the retired `dev` branch, and a green health check on a schema-less database —
were all the same shape. **A green signal standing in for evidence.** The fixes that held were
the ones that demanded the artifact itself: prisma's output, the merge base, the seed counts.
Written up as conventions §21.

Still not true of prod, and tracked as issues rather than assumed:

- **#92** — `min_replicas = 0`, so the first tester after an idle period pays a 5–20s cold start.
  Declined at ~$14/mo while there were no users; revisit **before** testers arrive.
- **#40** — per-user capability grants. The genuine gate before beta testers.
- **#75** — break-glass data access. The admin-surface half is answered by #114; fixing an
  arbitrary row still has no supported path, and override jobs are now ruled out as unobservable.

**Backlog lives in GitHub Issues** (`gh issue list`), not in this file — see below.

**Age and personal attributes:** `spec/decisions/21_age-and-personal-attributes.md` — the platform
is **strictly 18+**, date of birth is required at account creation and never displayed, gender is
optional and shown when provided. Decided and **enforced** 2026-08-22 (#133).

⚠️ Google signup and sign-in are now **separate flows**. Sign-in authenticates existing accounts
and never creates one — previously it did, which meant an account could exist for someone whose
age had never been checked. Account linking from settings is unaffected.

**Portability constraint:** `documentation/21_Infrastructure-Conventions.md` §24 — no
provider-specific service without a named replacement. The only reason the current provider was
chosen is the nonprofit grant.

**Platform requirements:** `documentation/22_Platform-Requirements.md` — what the app needs stated
without reference to any provider, so the Azure guide, a future VPS guide, the migration doc and
the budget all consume one source instead of restating it four times. ⚠️ Its sizing is estimated,
not measured — there are no users to measure.

**Data map:** `ops/data-map.md` — what personal data exists, where it lives, what anonymisation
actually clears, and what has no retention policy. The shared input for the privacy policy (#81),
DPDP work, the backup policy, and the migration plan. Written 2026-08-22 so those four do not
each invent their own answer.

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
| Prod web | `https://veervrat.jnanaprabodhini.org` — ✅ live and correctly wired since `prod-2026-08-17` |
| Prod api | `https://api.veervrat.jnanaprabodhini.org` |
| Terraform | `veervrat-app/infra/terraform/` — `envs/shared`, `envs/uat`, `envs/prod` all applied, plans clean |
| CD | `.github/workflows/cd.yml` — merge to `main` auto-deploys UAT; `prod-*` tag deploys prod. Both paths proven; doc-only merges skip the build |
| Images | `veervratacr` — `veervrat-api`, `veervrat-api-migrate`, `veervrat-web`, built + cached in CI (GitHub Actions cache, not the registry) |
| DNS | ✅ **live 2026-08-17** — 4 hostnames (web + api, UAT + prod) on `*.veervrat.jnanaprabodhini.org`, per-record via Shantanoo, managed TLS bound (O1/D14) |

`main` is the trunk; `dev` is retired. See `veervrat-app/AGENTS.md` → Git conventions.

📌 **Before deploying anything new, read the traps table in `azure-account-facts.md` §5.**
The first deploy hit seven distinct ones (Docker context bloat, arch mismatch, tag drift,
deploy-before-image, orphaned failed app, un-allow-listed Postgres extension, silently
dropped build args). 2026-08-21 added four more, all about **false success**: job overrides
replacing the container spec, overridden executions producing no logs, `/health` staying green
on a schema-less database, and job logs not living where app logs do. Every one is documented
with its guard.

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
| D9 | ~~Resend~~ → **JP's own SMTP relay** (flipped 2026-08-17) | Original reasoning ("Resend is already coded; never use Google Workspace SMTP — risks JP's domain reputation") was sound but its premise dissolved. JP IT provides a relay that sends as **`notifications.jnanaprabodhini.org`** — a purpose-built notifications subdomain, *not* JP's staff mail domain — so the reputation risk D9 was protecting against does not apply. What settled it: **credentials verified working end-to-end** 2026-08-17 (`235 Authentication successful`), and Shantanoo's own test mail landed in a **Gmail inbox, not spam** — real deliverability evidence, which no amount of config review provides. Also removes an external dependency, a third-party account, and Resend's 3,000/mo ceiling that D18 flagged as user-facing. Connection: `dhoomketu.in:587`, **STARTTLS** (`secure: false` + `requireTLS: true` in nodemailer — `secure: true` means implicit TLS on 465 and fails here). From: `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>`. Creds at `~/.secrets/veervrat/smtp-jp.env` (600, outside git), destined for Key Vault. Residual risk, accepted: deliverability reputation is now shared with other JP apps using that domain — smaller than the staff-mail risk, and not ours to control. Code swap shipped 2026-08-17. |
| D10 | **Two deployed environments**: UAT + prod. Local docker-compose is "dev" | A third costs 3× for no user |
| D11 | **Beta testers live on PROD**, not UAT | ♻️ **Rationale replaced 2026-08-16.** The original reason ("otherwise you must migrate real personal data at launch") died with D19 — there is no data to migrate. The conclusion still holds, for a different and better reason: **UAT is the staging and approval environment**, where Nachiket reviews unreleased changes before they ship. Real beta users cannot live in an environment that is deliberately running unreviewed code. Confirmed in O7. |
| D20 | **Feature access is per-user data in the DB, not env vars** (2026-08-16) | A user can only be allowlisted *after* signing up, so an env allowlist costs a full deploy cycle per tester (signup → find UUID → edit Terraform → PR → CD → access). Managed instead through the admin dashboard. `CONTENT_EDITOR_USER_IDS` is deleted and content-editor access migrates to the same model — one mechanism, not two. **Env vars keep only environment-level toggles** (`CONTENT_EDIT_ENABLED=false` on prod, permanently, for everyone): "does this feature exist here" is config, "which users have it" is data. See **#40**. |
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
| O1 | ✅ **CLOSED 2026-08-17** — DNS per-record, not delegation (revised 2026-08-16, see D14). Met Shantanoo 2026-08-16 — the earlier Azure zone + NS-delegation request is superseded, he added records directly. **Web hostnames live and verified 2026-08-17**: `https://veervrat.jnanaprabodhini.org` (prod) and `https://uat.veervrat.jnanaprabodhini.org` (UAT), both serving real traffic with Azure-managed DigiCert TLS certs, hostnames bound `SniEnabled`. Caught and fixed same day: Shantanoo hit Azure's default 404 page hitting the domain — records were live, but the hostname wasn't yet bound to the Container App on our side (that step was always ours, not his). ⚠️ D14's original "only 2 hostnames are ever public" was wrong: `DEPLOYMENT.md`'s pre-existing DNS-cutover checklist (predates this thread) calls for **api hostnames too** (`api.veervrat.…`, `api.uat.veervrat.…`), specifically to enable same-site cookies and remove the Next.js rewrite proxy — the proxy is the documented reason WebSocket chat has never worked in production (O8). 4 more records requested from Shantanoo 2026-08-17; confirmed live same day, hostnames bound, managed certs issued — **all 4 hostnames now serve real traffic with valid TLS**: `veervrat.jnanaprabodhini.org`, `uat.veervrat.…`, `api.veervrat.…`, `api.uat.veervrat.…`. ✅ **DNS side closed.** Not yet done: the actual cookie/proxy-removal code change (`COOKIE_SAMESITE=lax`, drop the Next.js rewrite) — that's O8's work, a separate deliberate change, not a side effect of DNS landing. The now-unused Azure DNS zone (`veervrat.jnanaprabodhini.org`, `envs/shared/dns.tf`) was **decommissioned 2026-08-24** (#80) — verified orphaned first: no NS delegation pointed at it and it held only its 2 automatic records | — | O8 (chat) |
| O22 | ✅ **CLOSED 2026-08-17** — prod's frontend was talking to UAT's backend. Found 2026-08-17, reproduced 3/3, while prod was live with `/ready` green on both tiers. `next.config.ts` reads `API_ORIGIN` at module scope; Next bakes `rewrites()` destinations into the build at **build time**, so the runtime env var Terraform sets on prod was silently ignored, and the promoted image kept UAT's value. Every prod request would have read/written **UAT's database**. Blast radius zero — prod had no users. Not one bad variable but a category error: **anything build-time cannot vary per environment under "promote, never rebuild"** — same root cause as the `NEXT_PUBLIC_SITE_URL` og-tag bug and the `NEXT_PUBLIC_FEEDBACK_MODE` problem behind **#40**. Written up as `documentation/21_Infrastructure-Conventions.md` §17. Fix is OpenSpec change `runtime-environment-config` (runtime config + drop the proxy + `SameSite=Lax` + CORS + a post-deploy wiring check); also unblocks O8's WebSocket transport | Claude | prod usable at all |
| O23 | ✅ **CLOSED 2026-08-18** — Google sign-in configured in **both** environments. Project `veervrat` under the `jnanaprabodhini.org` org, one OAuth client per environment, each secret in that environment's Key Vault, callback URLs on the **api** origin (they moved when the proxy was removed). Verified by a real sign-in on UAT. Testing mode, 100-user cap; no "unverified app" interstitial, since the scopes are non-sensitive. Full setup recorded in `azure-account-facts.md` §9 | — | — |
| O21 | ✅ **CLOSED 2026-08-17** — email goes through JP's SMTP relay, not Resend (**D9 flipped**), **implemented and delivering** — a real message reached an external Gmail inbox, not spam. Every open question answered: sends as `notifications.jnanaprabodhini.org` (dedicated notifications subdomain, not staff mail — which is what resolved the D9 reputation concern); credentials received and **verified authenticating** (`235`); Shantanoo's test mail reached a Gmail **inbox, not spam**. Mailbox is `do-not-reply-veervrat@` (his naming, already provisioned — we adopt it, not the `noreply-` I'd suggested). Creds stored at `~/.secrets/veervrat/smtp-jp.env` (600, outside git). Code shipped 2026-08-17. | — | — |
| O2 | ✅ **CLOSED 2026-08-16** — `veervrat.jnanaprabodhini.org` finalised over `veervrat.com` | — | — |
| O3 | Buy `veervrat.com` defensively (~$10) | Om | — |
| O4 | Devavrat to **verify billing email** (shows "Not verified") | Devavrat | billing notifications |
| O5 | Add JP PAN/GSTIN to billing account (Tax ID empty) | Om → JP finance | invoice compliance |
| O7 | ✅ **CLOSED 2026-08-16, implemented 2026-08-21** — **UAT:** feedback widget for all users (`FEEDBACK_MODE=all`), content editor per grant. **Prod:** feedback widget for granted users only (`FEEDBACK_MODE=granted`); **content editor never, for anyone** — refused at the API when `ENVIRONMENT=prod`, not merely disabled in config, so a grant that could never take effect cannot be issued. Access is DB-backed (`user_capabilities`) and managed from `/admin/users/[id]` (D20). Shipped as **#40**. ⚠️ Found while implementing: the widget's gating had been **cosmetic** — `FEEDBACK_MODE` was set on the web tier only and `hasPermission` returned true for `feedback.*` for any authenticated user, so the endpoint accepted feedback from anyone signed in. Those permission rows had no test coverage at all. Both fixed; conventions §23 | — | — |
| O8 | **Chat production-readiness** — own work packet. The gateway is competently built (auth on connect, rooms, sequence numbers, image upload) but **has never once run successfully in production** — the Next.js rewrite proxy blocked WebSocket upgrades from day one, so all real-world behaviour is unverified. Redis adapter now fixed; transport half needs the custom domain. Needs: reconnection, delivery guarantees, offline/unread, push notifications, UX review | later | scaling >1 replica |
| O9 | ✅ **CLOSED 2026-08-15** — Round 1 app fixes shipped (shutdown, distributed throttler, socket adapter, DB pool) | — | — |
| O10 | ✅ **CLOSED 2026-08-18** — Terraform complete: `envs/shared`, `envs/uat`, `envs/prod` all applied, both environments verify `No changes` against `main`. Phase 2B landed 2026-08-16 and prod has been serving since `prod-2026-08-17` | — | — |
| O15 | ✅ **CLOSED 2026-08-24** — SDK swap shipped as **#139**. `uploads.service.ts` now uses a strategy pattern: `azure-blob-storage.provider.ts` (cloud) / `s3-storage.provider.ts` (local). Azure Blob accounts provisioned (`veervratuatuploads`, `veervratproduploads`). **Exercised on UAT 2026-08-24** — real upload + byte-identical read-back. ⚠️ One residual: `content-overrides.repository.ts` still imports `@aws-sdk/client-s3` directly, bypassing the abstraction | — | — |
| O16 | ✅ **CLOSED 2026-08-21** — ⚠️ **This was closed wrongly on 2026-08-16 as "built + proven". It was built; it was never proven.** The job had not applied a single migration in any environment, ever. CD started it with `az containerapp job start --image`, which replaces the whole container spec — dropping `command`, `args` and `env`. Each run executed the image's default entrypoint with no `DATABASE_URL`, migrated nothing, printed nothing, and exited 0; Container Apps recorded **Succeeded** and CD reported "migrations applied". Prod's database was created 2026-08-16 and held **no tables at all** until 2026-08-21 — five days, three "successful" migrations. Surfaced only when a real signup returned 500 with `The table 'public.users' does not exist`. Fixed in **#112**: no overrides, the job's configured image asserted first, and prisma's own output **required** before a migration is accepted. Written up as `documentation/21_Infrastructure-Conventions.md` §21, with the general rule — *a success status is a claim, not evidence.* Now genuinely proven: prod migrated 2026-08-21 (`All migrations have been successfully applied.`), and the next prod deploy verified itself through the new guard | — | — |
| O17 | **ACR purge task** — retention policies are Premium-only; on Basic use a scheduled `acr purge`. Needed once CD pushes an image per merge | Claude | registry cost |
| O11 | UAT data policy — seeded, never real users (per D11) | settled in principle | — |
| O12 | Rotate exposed secrets at cutover (PAT, session secret, R2 keys) | Om + Claude | cutover |
| O24 | ✅ **CLOSED 2026-08-27** — password rotated. Originally filed as a second O18 (duplicate id, corrected here). `e2e/auth-and-nav.spec.ts` had hardcoded a real personal login — `om.chavan501@gmail.com` and its plaintext password — from commit `258395a` until removed on 2026-08-27. Password rotated same day; the line is gone from working tree but remains in git history (repository is on GitHub). Found in `ops/audit/01-e2e-runtime-pass.md` §2 | Om | — |
| O13 | Turn **off** root-scope Elevate access | Om (deferred by choice) | — |
| O14 | Budget→automation **hard stop** before public launch (MCA has no spending limit) | later | launch |

> **O-threads vs B-items.** An **O-thread** is scheduled work with an owner that blocks
> something. A **B-item** is noticed-but-unscheduled. When a B-item gets picked up it is
> *moved* to this table, not copied. Merging the two registers on 2026-08-16 removed three
> duplicates (ACR purge, chat readiness, feedback-widget environment) that existed in both.

---

## 🔄 In-flight OpenSpec changes

`openspec/changes/` — genuinely incomplete work, not process debt. Task counts verified
2026-08-27. Archived changes live in `openspec/changes/archive/`.

**Archived 2026-08-27** (PR #234 + this batch):
`bootstrap-admin-grant` (32/32), `vratmitra-roster` (14/14), `data-export-ui` (13/13),
`ended-enum` (8/8), `capability-grants` (35/35). All in `openspec/changes/archive/`.

**Near-complete (1–2 tasks remaining):**
- `upload-visibility` — 29/31 (#139 closed)

**In progress:**

Counts re-measured against the working tree on **2026-08-29**. Several rows below had drifted far
enough to mislead — `reauthentication` read 13/22 while it was at 21, and
`prevent-duplicate-journeys` read "proposed, not started" while it was 10/11 and implemented.

| Change | Tasks | Note |
|---|---|---|
| `ui-ux-remediation` | 37/39 | 2 remaining — E2E suite, browser re-walk |
| `age-gate-and-consent` | 39/42 | 3 remaining — the first deletes all users, needs Om |
| `content-suggestions` | 24/28 | 4 — deploy verification |
| `received-invitations` | 23/23 | 4 — deploy verification, needs two accounts |
| server-resolved-auth | 24/24 | ✅ **Archived 2026-08-30** |
| `experience-log-view` | 17/18 | 4 — routing + deploy verification |
| `reauthentication` | 21/22 | **1 — 6.3, the Marathi strings.** 5.1–5.3 all verified in a browser on UAT 2026-08-29; the walk found five auth defects, all fixed and deployed (#238, #242, #244, #246, #248) |
| `my-vratmitras-chat` | 49/62 | the remainder is O8 — chat has never run in production |
| `prevent-duplicate-journeys` | 11/11 | 1 — 4.3, a manual rapid-request test. Implementation was already complete |
| `offsite-backup` | 0/19 | **proposal only**, added 2026-08-29 (#131). Nothing implemented: the destination had to be decided first, and #131's recommendation conflicts with the India residency requirement |

---

## 📥 Backlog → GitHub Issues

**The backlog lives in GitHub Issues, not here.** Migrated 2026-08-18.

```bash
gh issue list --state open                 # everything open
gh issue list --label p1 --state open      # what actually blocks
```

The `B<n>` list that used to sit here was a second backlog running alongside the Issues that
`documentation/20_Solo-Dev-Operations.md` already called canonical. The two drifted: Issues held
product and UX work from July, this file held infrastructure and auth work from August, and
neither referenced the other. The same item existed in both at different priorities — the admin
dashboard was `p3` as issue #40 and `p1` as `B1`.

Deciding factor for consolidating *into Issues* rather than the reverse: **Issues do not depend
on anyone remembering to open a file.** `gh issue list` works from a cold start, survives a
context compaction, links to the PR that closes it, and is where the feedback widget already
drains. Same reasoning as the pre-commit hook — mechanism over memory.

**What stays in this file, and why it is not a backlog:**

| Section | What it is |
|---|---|
| **Decisions (`D`)** | A register of what was settled and why. Not work; nothing to close. |
| **Open threads (`O`)** | The few things in flight *right now*, usually with a person waiting. Short-lived — an `O` either closes or becomes an issue. |
| **Inbox** | Raw untriaged notes, drains to empty at the next triage. |
| **Working order** | The current sequence, pointing at issue numbers. |

Anything noticed but not being worked on right now goes straight to an issue.

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
12. ✅ **Email delivering** (O21) — nodemailer over JP's relay. **Verified by a real delivered email**
    2026-08-17: reached an external Gmail inbox, not spam, which also proved the relay sends
    outside JP's own domain (never previously tested). ⚠️ Prod's Key Vault still holds the
    placeholder SMTP password — set it before the next prod deploy
13. ✅ **Signup → verify → login proven on UAT**, and **`prod-2026-08-17` shipped**. Completing
    onboarding (display name, username, gender, DOB) exercised several state-changing writes
    across hosts, so CSRF double-submit and credentialed CORS are verified against the new
    architecture. Prod redeployed and confirmed pointing at its own api.
    ⚠️ Still unverified: session persistence across a **reload**, **logout**, and whether
    **prod** can actually send email (its config matches UAT and the real password is in its
    Key Vault, but no message has been sent from prod — deliberately, since #75 means a test
    account on prod cannot be deleted)
14. ✅ **Google sign-in live** (O23) — project `veervrat` under the JP org, one OAuth client per
    environment, secret in each Key Vault. Signed in successfully on UAT 2026-08-18. Testing
    mode, 100-user cap; no "unverified app" warning, since the scopes are non-sensitive
15. ✅ **#74** — re-send verification email. Closed 2026-08-20, archived as
    `account-verification-recovery`
16. ✅ **#40** — per-user capability grants + admin dashboard. Closed 2026-08-21, archived as
    `bootstrap-admin-grant`
17. ✅ **#88** (prod email) closed 2026-08-21. **#92 (`min_replicas=1`) still open** — the last
    thing before inviting a real beta tester
18. ✅ Blob storage (O15) — SDK swap shipped as #139, exercised UAT 2026-08-24. Decommission
    Neon/Upstash/R2 and #84 (budget proposal) remain
19. Not urgent, but do not lose: #89 (backups have never been restored — untested is not a
    backup), #93 (no hard spending cap; grant expiry silently bills a personal card), #90
    (Terraform state RBAC is broader than it should be), #91 (VNet/private endpoints, deferred
    with a trigger rather than a date)

Rationale for 5-before-6: CD automates a deploy you understand. Written first, every
first-time deployment surprise surfaces as a red CI log instead of in front of you.

Rationale for 11-before-everything: it is the only item that makes prod *wrong* rather than
*incomplete*. A user reaching prod today would have their data written to UAT.

**This section is where sequence lives.** GitHub Issues carries *priority* (`p0`–`p3` labels)
but has no inherent ordering, and the old `B1…B18` numbering never encoded one either — it was
creation order, not a queue. So the two are deliberately split: **labels say how much something
matters, this list says what happens next.** Only the next few items need to appear here;
everything else is simply an open issue.

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



<!-- Manual entries filed as GitHub Issues 2026-08-27:
     #230 — username validation display + wrong error
     #231 — onboarding step 1 re-asks display name/username
     #232 — "take me to test" button goes to dashboard
-->

