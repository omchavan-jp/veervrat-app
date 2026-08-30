# Data Map — what personal data exists, where, and for how long

**Purpose.** The shared input for four things that would otherwise each invent their own answer:
the privacy policy (#81), DPDP compliance, the backup and retention policy, and the migration
plan. Written once, referenced by all of them.

**Status.** First pass, 2026-08-22, derived from `apps/api/prisma/schema.prisma` and the
anonymisation code — not from a lawyer. It records **what the system actually does**, which is the
input a lawyer needs, not a substitute for their advice.

⚠️ **The platform is restricted to adults aged 18 and over**
(`spec/decisions/21_age-and-personal-attributes.md`). Age is self-declared at account creation and
validated before the account exists. Self-declaration means the restriction is a stated rule with
a recorded affirmation, not a guarantee — accounts found not to qualify are removed.

This materially narrows the compliance position: the requirements around children's data do not
apply. It does not remove the need for care about what is held, which the rest of this document
describes.

---

## 1. Personal data held

### Identity — `users`

| Field | Notes |
|---|---|
| `email` | unique; also the login identifier |
| `displayName`, `username` | `username` is public-facing and appears in profile URLs |
| `avatarUrl` | reference to a file in object storage. Uploads are built but object storage is not yet provisioned, so no files exist |
| `gender` | Optional. Shown on the profile when provided; leaving it blank is the opt-out |
| `dob` | **Required at creation** and validated as 18+. Never displayed and never returned by the public profile API — it is an identity-verification token. Nullable in the database only so anonymisation can clear it (#140); the creation path still always supplies one |
| `language` | preference, not identifying |

### Consent — `user_consents`

Which policy document a person accepted, at which version, and when. Recorded in the same
transaction as the account, so an account cannot exist without a corresponding record. Retained
for as long as the account exists — it is the evidence that consent was given, so deleting it
would defeat its purpose.

### Signup handoff — `pending_signups`

Holds a date of birth and consent for a few minutes while the browser completes a Google sign-in
round trip, so those values never travel in a URL. Deleted when used, and a scheduled job removes
any that expire unused.

### Credentials — `auth_accounts`

`passwordHash` (bcrypt) and, for Google sign-in, `providerAccountId` — a **stable Google
identifier** for that person.

### Technical / behavioural

| Where | Fields | Retention |
|---|---|---|
| `sessions` | `ipAddress`, `userAgent`, `expiresAt` | ⚠️ **Rows are never deleted.** Nothing removes them once expired (tracked as issue #77) |
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

**Cleared:** `displayName`, `email`, `username`, `avatarUrl`, `dob`, `gender`, `pendingEmail`,
`auth_accounts.passwordHash`.

`dob`, `gender`, `pendingEmail` and the password hash were added in #140. The decision rule
applied was that a field is cleared unless a purpose survives the account. `dob` existed to run
the 18+ check at creation; `gender` is displayed and nothing else; `pendingEmail` held a real
deliverable address mid-change, which made the published sentence "we remove your email address"
untrue for anyone deleting during an email change; a password hash is credential material with
nothing left to authenticate.

**Retained deliberately, each with a reason:**

| Retained | Reason |
|---|---|
| `auth_accounts.providerAccountId` | The **Google identity link survives anonymisation**, by choice — but no longer indefinitely. **Changed 2026-08-29, see below.** Must be disclosed in the privacy policy |
| Content under the pseudonym | `spec/06`. A vratmitra's record of their guidance should not develop holes |
| `audit_events` | A security record legitimately outlives the account it describes |
| `sessions` IP address + user agent | Now swept nightly once expired (#77). Live sessions end at anonymisation |
| avatar **file** in object storage | The reference is cleared; **no stored file is ever deleted** — still true, and now slightly more pressing: uploads that are composed but never saved stay in storage as orphans (readable only by their uploader). Currently moot in a stronger sense than it looks — **nothing sets `avatarUrl` at all**, so no avatar files exist. Deletion must land together with avatar upload, and is a blocking criterion on #139 |

### Resolved 2026-08-23

The privacy policy was republished at **version 2**, disclosing the retained Google link, and the
consent re-prompt mechanism (deferred item 3.3) shipped alongside it — publishing without it would
have broken the promise the documents themselves make about being asked again on a material
change. Both are now live on UAT; prod follows once the re-prompt is confirmed working there.

### Changed 2026-08-29 — the link is released when somebody registers again

The reason recorded above for keeping the link — *"it is what stops an account someone deleted
being silently recreated and reattached"* — turned out to have a cost nobody had measured.

Keeping the row also kept the **address** and the **googleId** claimed inside
`@@unique([provider, providerAccountId])`, and nothing ever removed them. So a person who deleted
their account could never register again with either. Google sign-in found the dead row and looped
with no message; registering by email passed the duplicate check and then failed on a constraint
naming an account they could not see. Both reproduced on UAT (#238, #242).

**What happens now.** The rows still survive anonymisation, which is what lets a returning person
be *told* their account was deleted and on what date, rather than being dropped into a signup form
with no explanation. They are released — `AuthRepository.releaseIdentityClaims` — at the moment
somebody actually registers again, which is the first point at which holding them costs something.

Silent recreation is still prevented, by a better mechanism than a permanent claim: re-registration
goes through the signup flow, so the age gate and consent are answered again.

⚠️ **This narrows what version 2 of the privacy policy describes.** "The Google identity link is
retained" remains true of anonymisation itself, and is no longer true indefinitely — the link is
removed if that person returns. Whether the published wording needs revising is a question for the
policy review (#154), not one to settle by editing this file. Recorded on #140, which is where the
original decision was flagged as needing to be stated rather than assumed.

---

## 3. Retention

**There is no retention policy** for application data. Nothing expires except by explicit action.

**One exception, added 2026-08-30: database dumps are kept 30 days**, in Azure Blob and on the
machine they are pulled to, and deleted past that by the same jobs that write them rather than by
anyone remembering. The number is above UAT's 7-day managed backup window and below prod's 35.

It has a number because it needs one: a dump is a complete copy of every personal record the
platform holds, so an unbounded pile of them is a liability that grows on its own, and "how long
do you keep backups" is a question the privacy policy has to answer rather than avoid.

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
| **Database dumps** | Two places, and the difference matters. **(a)** `veervrat<env>backups`, Azure Blob, Central India — staging, private, encrypted. **(b)** A maintainer's machine, in India, holding the copy pulled out of Azure. Only (b) satisfies #131: (a) is in the same subscription as the database it protects. Each dump is a complete copy of every personal record the platform holds, AES-256 encrypted before it leaves the job, retained **30 days** in both places. See `openspec/changes/offsite-backup` |
| Sessions / cache | Azure Managed Redis, same region |
| Secrets | Azure Key Vault, per environment |
| Object storage | Azure Blob, **Central India** — same region as everything else, so this does not affect the residency claim the way Sentry does. Both environments (`veervratuatuploads`, `veervratproduploads` — the latter created by `prod-2026-08-24.1`). ⚠️ **Prod's has never had a file written through it**, and prod still runs the pre-#178 single-container layout until the next prod tag. ✅ **Exercised end-to-end on UAT.** Uploaded 2026-08-24; made private 2026-08-25 (#178). An image is now served by the api, which decides per request whether the viewer may see it — **visibility derives from the document containing the image**, so a chat image follows room membership and an experience image follows that log's own visibility (including guest access to a published one). Verified on UAT: uploader 200, anonymous 404, blob unreachable directly 404. Blog images stay public and cacheable, deliberately. See `documentation/22_Platform-Requirements.md` |
| Email in transit | JP IT's relay (`dhoomketu.in`), sending as `notifications.jnanaprabodhini.org` |
| Logs incl. IP/user agent | Azure Log Analytics, 30-day retention |
| **Infrastructure state file** | ⚠️ Holds **every secret in plaintext**. Read access to it is equivalent to secret-store administrator access (issue #90) |
| **Error diagnostics** | ⚠️ **Sentry, EU (Frankfurt)** — the only data that leaves India. See below |

Data residency was India for everything until 2026-08-23.

### The one exception — error diagnostics (Sentry, EU)

Hosted Sentry offers EU or US only; there is no India region. EU chosen — GDPR protections apply
by default and US providers are reachable under the CLOUD Act.

**What is sent:** 5xx exceptions only — message, stack trace, request method and path, plus the
release SHA and environment name. `sendDefaultPii: false` stops the SDK attaching cookies,
headers, IP addresses or user records, and a `beforeSend` scrubber redacts email addresses and
long opaque tokens from message text before it leaves the process.

**What is therefore still possible:** a stack trace can name a route containing an identifier,
and a redactor is a filter, not a proof. Treat Sentry as holding a small amount of incidental
personal data, not none.

**Retention:** 30 days on the free tier (Sentry's default for the Developer plan).

✅ **Resolved 2026-08-23.** The privacy policy (version 2) now discloses this directly, in both
languages, including what a report contains and does not. Version 1 said data is stored in India,
full stop — that sentence predates Sentry and was corrected rather than left standing. The stored
Google profile picture is a separate, later item: not included in v2, because it is not built —
nothing sets `avatarUrl` yet — and a policy describing what the system doesn't do would be wrong
in the other direction. Goes in with #139.

Lawful regardless: DPDP 2023 permits cross-border transfer except to countries the government
notifies as restricted, and none have been notified. The defect is accuracy, not legality.

---

## 5. Who can reach it

- **`ADMIN` role** — the admin dashboard: user search, detail, roles, capabilities, suspend,
  force-logout, anonymise. Audited.
- **Azure subscription access** — one operator (Om). Terraform state access is effectively Key
  Vault admin for both environments (#90).
- **JP IT** — controls DNS and the mail relay. Sees mail metadata; not application data.
- **Vratmitras** — see their assigned vratarthi's journey content by design. This is a product
  relationship, not an administrative one, and the policy should describe it as such.

## 5a. Self-service data export (#135, 2026-08-23)

`GET /users/me/data-export` — the mechanism the privacy policy has promised since it went live
("you can ask what data we hold about you") but that, until today, meant a manual database query
by whoever holds prod credentials.

**Included:** identity fields, linked auth providers (see exclusion below), consents, self-
assessment attempts and answers, journeys with their exposures/resolutions/challenges/check-ins,
experience logs (including private ones — they belong to the requester), chat messages in every
room they are party to (both directions), blogs, blog comments.

**Mentor sidenotes are included, but only if active.** The issue flagged these as "arguably the
most sensitive category, and the least obvious" because they are authored by someone else, about
the requester. Resolved by checking the product rather than guessing: an active sidenote is
already shown to the vratarthi in their own journey activity feed with an acknowledge action, and
a revoked one is already filtered out of every view they have. The export matches exactly what
the product already shows — it introduces no new disclosure, only makes it exportable.

**Excluded, deliberately:**

| Excluded | Why |
|---|---|
| `auth_accounts.passwordHash` | Never returned to anyone, including the account it belongs to. Not what a portability right is for, and pure downside to disclose |
| `audit_events` | A record of what an *administrator* did, not primarily the requester's own data. Left out pending the legal review in #134, not silently — flagged here for that review to weigh in on |

**Format: JSON.** Portability favours machine-readable over a rendered document, per the issue's
own framing.

**Throttled at 3/hour.** The heaviest read in the API by construction — it touches nearly every
table the account appears in — so the limit is capacity protection, not brute-force defence.

**Self-service, not administrative**, per the issue's first open question: it removes a manual
burden from whoever would otherwise run that query, and the endpoint can only ever return the
caller's own data — there is no way to name another user's id.

---

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
**factual basis** those require: what the system does, verified against the source rather than
remembered. Re-verify it before relying on it — code changes and this document does not follow
automatically.

Related: #81 (privacy policy + terms), #77 (session retention), #90 (state RBAC), #89 (backups
never restored), `ops/azure-account-facts.md` §6 (access inventory).
