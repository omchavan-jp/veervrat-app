# Data Map — what personal data exists, where, and for how long

**Purpose.** The shared input for four things that would otherwise each invent their own answer:
the privacy policy (#81), DPDP compliance, the backup and retention policy, and the migration
plan. Written once, referenced by all of them.

**Status.** First pass, 2026-08-22, derived from `apps/api/prisma/schema.prisma` and the
anonymisation code — not from a lawyer. It records **what the system actually does**, which is the
input a lawyer needs, not a substitute for their advice.

⚠️ **The platform holds data about minors.** That raises the stakes on every row below, and is the
single most important sentence in this document.

---

## 1. Personal data held

### Identity — `users`

| Field | Notes |
|---|---|
| `email` | unique; also the login identifier |
| `displayName`, `username` | `username` is public-facing and appears in profile URLs |
| `avatarUrl` | points at object storage; **no files exist yet** (uploads unprovisioned) |
| `gender`, `dob` | optional. `dob` is a strong identifier and, for a minor, sensitive |
| `language` | preference, not identifying |

### Credentials — `auth_accounts`

`passwordHash` (bcrypt) and, for Google sign-in, `providerAccountId` — a **stable Google
identifier** for that person.

### Technical / behavioural

| Where | Fields | Retention today |
|---|---|---|
| `sessions` | `ipAddress`, `userAgent`, `expiresAt` | ⚠️ **never deleted** — see #77 |
| `audit_events` | `actorId`, `ipAddress`, `userAgent`, `metadata` | no policy defined |
| `feedback_items` | reporter identity, route, viewport, user agent | no policy defined |

### The sensitive core — self-assessment content

This is the part that matters most and is easiest to overlook, because none of it looks like
"personal data" in the usual sense:

- `test_attempts` / `test_answers` — a person's self-scored **weaknesses**
- `journeys`, `journey_weaknesses`, `journey_exposures/resolutions/challenges` — what they are
  working on and how they are progressing
- `experience_logs` — free-text personal reflections
- `vm_sidenotes`, `resolution_checkins` — a mentor's notes about them
- `chat_messages` — private conversation with a vratmitra

**A weakness self-assessment written by a 15-year-old, plus their mentor's notes about it, is
more sensitive than their email address.** Any policy that protects the email and ignores this
has protected the wrong thing.

---

## 2. Deletion and anonymisation — verified, not assumed

`selfDelete` and admin `anonymise` share one primitive (`users.service.ts`). It replaces
identity with a deterministic pseudonym, soft-deletes, suspends, kills sessions, cancels pending
invitations, and drops the user from the search index. Content is **retained** under the
pseudonym — a deliberate decision (`spec/06`), not an oversight.

**Cleared:** `displayName`, `email`, `username`, `avatarUrl`.

**Retained, and worth a decision:**

| Retained | Why it matters |
|---|---|
| `dob`, `gender` | ⚠️ Not cleared. `dob` narrows identity sharply, especially combined with retained content |
| `auth_accounts.providerAccountId` | ⚠️ The **Google identity survives**. The account is pseudonymous in our database and still linked to a real Google user |
| `auth_accounts.passwordHash` | Not cleared |
| `sessions` / `audit_events` IP + user agent | Persist indefinitely (#77) |
| avatar **file** in object storage | `avatarUrl` is nulled; the underlying object is not deleted. Moot today (no files), a real gap once uploads exist |

None of these is necessarily wrong — audit trails legitimately outlive accounts. But they are
currently **unstated**, and "we anonymise your account" is a claim a privacy policy will make.
It should be true in the specific sense the policy words it.

---

## 3. Retention

**There is no retention policy.** Nothing expires except by explicit action.

The machinery exists — `ScheduleModule` is wired and two crons already run
(`dormant-journeys.cron.ts`, `notifications.cron.ts`) — so adding retention is small work, not
new infrastructure. (Note for #77: its "there is no cron" line is inaccurate; the scheduler is
there, only the session-cleanup job is missing.)

Decisions needed, none of them technical:
- how long an expired session row is kept
- how long audit events are kept (compliance argues *longer*, minimisation argues *shorter*)
- whether an anonymised account's content is kept forever
- what happens to a minor's data when they turn 18

---

## 4. Where the data physically lives

| Data | Location |
|---|---|
| All application data | Azure Postgres Flexible Server, **Central India (Pune)** |
| Sessions / cache | Azure Managed Redis, same region |
| Secrets | Azure Key Vault, per environment |
| Object storage | **none yet** — S3-compatible, unprovisioned |
| Email in transit | JP IT's relay (`dhoomketu.in`), sending as `notifications.jnanaprabodhini.org` |
| Logs incl. IP/user agent | Azure Log Analytics, 30-day retention |
| **Terraform state** | ⚠️ Holds **every secret in plaintext** — see #90 |

Data residency is India, which simplifies DPDP considerably. Worth stating explicitly in the
policy rather than leaving implicit.

---

## 5. Who can reach it

- **`ADMIN` role** — the admin dashboard: user search, detail, roles, capabilities, suspend,
  force-logout, anonymise. Audited.
- **Azure subscription access** — one operator (Om). Terraform state access is effectively Key
  Vault admin for both environments (#90).
- **JP IT** — controls DNS and the mail relay. Sees mail metadata; not application data.
- **Vratmitras** — see their assigned vratarthi's journey content by design. This is a product
  relationship, not an administrative one, and the policy should describe it as such.

---

## 6. Open questions for legal consultation

1. **Minors' consent.** Who consents — the child, a parent, the school? DPDP treats children's
   data distinctly, and this is the question with the widest blast radius.
2. **What "delete my account" must mean** versus what it currently does (§2).
3. **Retention periods** for audit events and IP addresses.
4. **Public data publishing** — blogs and public experience logs are user-authored and may be
   written by minors.
5. **Lawful-request handling** — no procedure exists for a court or police request. Needed
   before it is needed.
6. **Vratmitra visibility** — a mentor reads a minor's self-assessments. Consent framing matters.
7. **Breach notification** — DPDP obligations, and who decides.

---

## 7. What this document is not

It is not a privacy policy, not legal advice, and not a compliance certification. It is the
**factual basis** those require: what the system does today, verified against the code rather
than remembered.

Related: #81 (privacy policy + terms), #77 (session retention), #90 (state RBAC), #89 (backups
never restored), `ops/azure-account-facts.md` §6 (access inventory).
