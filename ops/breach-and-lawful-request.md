# Two procedures: a data breach, and a lawful request for user data

Both situations are rare, both are decided under time pressure, and both are decided badly when
improvised. This document exists so that the decisions are made now, calmly, by people who are not
also managing the incident.

**Written 2026-08-31, from the system as it actually is.** It names roles rather than individuals,
so it survives people changing.

---

## ⚠️ Read this before relying on any number below

**The legally determined values are not settled.** Questions 6 and 7 of
`ops/legal-briefing-pack.md` ask a data-protection adviser exactly what this document needs:
breach notification thresholds, timelines and who must be told; and whether a prescribed procedure
exists for a court or police request.

Everywhere a legal answer is required, this document says **TO CONFIRM** and states what we would
do in the meantime. Those interim positions are deliberately cautious — they are not advice, and
they are not a substitute for the review. When the answers arrive, they replace the interim
positions and this warning goes away.

What is *not* provisional is everything describing how the system behaves: where data lives, what
the audit log captures, how long backups survive. That is verified and can be relied on.

## What this is not

| | |
|---|---|
| **#143 — incident response** | A breach is one kind of incident. That procedure covers production breaking generally: detection, severity, comms, post-incident record. This document covers only the case where **personal data has or may have been exposed**, which adds obligations to people outside the organisation. |
| **`DEPLOYMENT.md` → restoring from a dump** | The recovery runbook. Rehearsed and reliable. A breach may need no restore at all, and a restore is usually not a breach. |
| **#143 — platform shutdown** | A planned wind-down, where users are told in advance and data is deleted deliberately. |

---

## Roles

Named as roles because the holders will change, and because one person currently holds several —
which is itself the largest weakness in both procedures.

| Role | What it decides | Held today |
|---|---|---|
| **Operator** | Technical containment: revoking credentials, stopping compute, reading logs, restoring. Holds Azure subscription access, which in practice means the ability to read every secret and every record. | Om Chavan |
| **Data owner** | Whether an event is a breach, what is disclosed, and what is handed to an authority. Answers for the organisation. | **Ashutosh Barmukh**, सहकार्यवाह (Sahakaryavaha), Jnana Prabodhini |
| **Spokesperson** | The only person who speaks publicly or to a regulator. May be the data owner. | **Om Chavan** — interim, see below |
| **Reviewer** | The data-protection adviser. Consulted on threshold and notification, not on containment. | Not yet appointed (#154, legal pack) |

**Filled 2026-09-01.** Both posts were unnamed until then, and the procedure could not be followed
without them.

⚠️ **`Sahakaryavaha` is recorded in Marathi because that is the authoritative form.** It means
joint or associate *karyavaha* — secretary — and is ordinarily rendered **Joint General Secretary**
in English. That rendering is the general meaning of the term, **not a title confirmed with Jnana
Prabodhini**: the organisation publishes no office-bearer roster, and the one title on its site is
a different word (कार्याध्यक्ष, Karyadhyaksha, "Executive Head"). Confirm the English form with JP
before it appears in anything sent outside — getting a named person's title wrong in a
notification to a regulator is its own small harm.

⚠️ **The Operator and the Data owner must not be the same person for a decision about that
person's own access.** They are now different people, which is the improvement. But the
Spokesperson and the Operator **are** the same person — Om holds Azure access and would also be
the one speaking. That is workable for a breach originating anywhere else, and it is not workable
for one involving Om's own credentials: the person explaining what happened would be the person it
happened through.

So this is better than it was and not yet right. The interim position is that a breach touching
the operator's own access is escalated to the Data owner **before** anything is said publicly, and
the Spokesperson role passes to them for that incident. Recorded rather than assumed, because it
is the case where improvising is most likely and least defensible.

---

# Part A — a breach

## What counts as one

A breach is **personal data being read, changed, copied or destroyed by someone with no right to
it**, or a credible possibility that this happened. It is not limited to an attacker: a
misdirected export, a public bucket, or an administrator reading records they had no business
reading are all breaches.

Two things about *this* platform should shape every judgement that follows.

**The sensitive material is not the email addresses.** Veervrat holds self-assessed personal
weaknesses, the resolutions and challenges someone set themselves, free-text reflections, private
mentor notes written *about* a person, and private mentor conversations. A leak of that is closer
in kind to a leak of counselling notes than to a leaked mailing list, and the severity assessment
must say so rather than counting records. `ops/data-map.md` §1 lists it precisely.

**Everyone here is an adult.** The platform is 18+ and the age is checked at account creation, so
the obligations around children's data do not apply. This narrows the position materially and is
worth stating early to any adviser or authority.

## Severity

Judged on **what was exposed**, not how many rows.

| | Shape | Examples |
|---|---|---|
| **High** | Any self-assessment content, mentor notes, chat, or experience logs — for even one person | database dump obtained; an admin account compromised; direct subscription access misused |
| **Medium** | Identity data only — names, addresses, usernames, DOB — with no self-assessment content | an export of the users table; a leaked mail list |
| **Low** | Data that identifies nobody, or that the person had already published | public blog content; aggregate counts |

A **single High** record outranks a large Medium set. That inversion is deliberate: it is the whole
reason this platform's severity scale cannot be borrowed from a generic template.

## The first hour — containment before analysis

Order matters. Analysis on a system still being read is analysis of a moving target.

1. **Stop the access.** Revoke the credential, force logout, or scale compute to zero. Deactivating
   the Container App revisions is how you stop the apps — scaling to `0/0` is rejected by Azure
   (`maxReplicas must be greater than 0`); the `stop-veervrat` runbook already does this correctly
   and can be run for a breach as readily as for a cost spike.
2. **Preserve evidence before changing anything else.** Take a dump (`veervrat-<env>-backup` job),
   and export the audit log and the Sentry events for the window. Containment often destroys the
   evidence of what happened; do it in this order.
3. **Write down the time you learned of it.** Every notification window starts there, not when the
   breach began.
4. **Tell the Data owner.** Before telling anyone else, and regardless of the hour.

## What we can and cannot reconstruct

Say this plainly to an adviser rather than discovering it during an investigation.

**Recorded:** every administrative *write* — anonymising an account, forcing a logout, changing
roles or capabilities, overriding a journey state, all content changes — with actor, IP address,
user agent and timestamp, in `audit_events`.

⚠️ **Not recorded: reads.** An administrator who opens a user's record and reads their weaknesses,
reflections and mentor notes leaves **no trace whatsoever**. Nor does anyone using the Azure
subscription to query the database directly, which bypasses the application entirely. So for the
most likely High-severity breach — someone with legitimate access looking at what they should not
— *we cannot say what was seen.* We can often say what was changed, and nothing about what was
read.

The honest consequence: where reads cannot be excluded, the scope must be assumed to be everything
that account could reach. That is a wider notification than the truth probably warrants, and it is
the correct default until read auditing exists.

⚠️ **Error tracking will not detect a breach.** Sentry is wired on both environments (#79) and
catches errors. A successful unauthorised read produces no error — it looks exactly like ordinary
use. Detection today depends on somebody noticing an anomaly, a report from outside, or the
audit log being reviewed, and none of those is a monitored control.

## Scope — remember the copies

Data does not stop existing when the database row does. When establishing what was exposed, or
what must be corrected:

- **Managed Postgres backups** — 7 days on UAT, **35 days on prod**.
- **Encrypted nightly dumps** — 30 days, in `veervrat<env>backups` and on a maintainer's machine.
- **Anonymised accounts retain their content** under a pseudonym, deliberately (`spec/06`).

So a person deleted last week is still in backups, and a breach of a backup is a breach of data
belonging to people who believe they left.

## Notification

**TO CONFIRM — legal pack question 6.** Thresholds, timelines, and whether the Data Protection
Board, the affected people, or both must be told.

**Interim position, until that answer exists:** notify the Data owner immediately; notify affected
people for anything assessed **High**, without waiting for certainty about scope; prepare a
regulator notification for any High breach on the assumption one is required. Erring toward
notifying is recoverable. Erring toward silence is not.

## What affected people are told

Written by the Spokesperson, approved by the Data owner. Plainly, and without softening:

- **what happened**, in one sentence, without jargon
- **what of theirs was involved** — and if we cannot establish what was read, say that, because
  "we cannot rule out that your reflections and your vratmitra's notes were seen" is the true
  statement and a vaguer one is not
- **what we have done**
- **what they can do** — change a password, and how to delete their account if they want to leave
- **who to contact**, with a real address that is monitored

Do not tell someone their data was "accessed" when what was exposed is a record of their own
self-assessed weaknesses. Name it.

## What is recorded afterwards

One document per breach, in `ops/`, whatever the outcome — **including for an event judged not to
be a breach**, since that judgement is the thing most likely to be questioned later.

What it holds: the timeline (when it began, when we learned, when contained), what data was
involved and how that was established, the severity and who assigned it, who was told and when,
what was said, and what changed as a result. If the scope could not be established, that goes in
too, with the reason.

---

# Part B — a lawful request for user data

A court order, a police request, a regulator's notice, or anything presented as one.

## Who receives it

**Any request goes to the Data owner immediately and is answered by nobody else.** Not the
operator, not an administrator, not whoever happened to open the email.

This is the single most important line in this document. The realistic failure is not a wrongful
disclosure ordered by a court — it is a plausible-sounding email answered helpfully by one person
within the hour.

## Verifying it is genuine

Before anything is read, let alone handed over:

1. **Confirm the request exists** through a channel you found independently — a published number
   for the court or station, never a contact detail from the request itself.
2. **Establish who is asking and under what authority.** A named officer, a case reference, the
   provision relied on.
3. **Establish what is actually demanded.** Requests are routinely broader than their authority.
4. **Record the whole of the above** before responding at all.

An urgent tone is not authority. Verification delays measured in hours are normal and defensible;
a wrongful disclosure is not reversible.

## Deciding what is handed over

**TO CONFIRM — legal pack question 7:** whether Indian law prescribes a procedure, what may be
refused, and whether a user may be told.

**Interim position:**

- Take advice before responding to anything beyond confirming an account exists.
- **Disclose the narrowest set that satisfies the request as written.** If it names a person and a
  date range, that is what is provided — not their whole record because it was easier to export.
- ⚠️ **A request for "this user's data" is broader here than it sounds.** It could reach their
  self-assessments, their reflections, and their vratmitra's private notes *about* them — which
  are also, in part, someone else's writing. Whether third-party content is in scope is a question
  for the adviser, not for whoever is preparing the export.
- The data export feature (#217) produces a user's own data and is the right starting point,
  because it has a defined scope somebody has already thought about.

## Whether the user is told

**TO CONFIRM.** Some orders forbid it; where nothing forbids it, telling the person is the default
we would want.

Do not promise, in the privacy policy or anywhere else, that users will always be told. Until this
is settled, say what is true: that we will tell them where we are permitted to.

## What is logged — and this will not happen automatically

⚠️ **Reading a user's record produces no audit event, and neither does exporting one.** The audit
log captures writes. So unlike almost everything else here, **the record of a lawful request is
made by hand or not at all.**

Write it up in `ops/`, at the time, containing: what was received and when; how it was verified,
including the independent channel used; who decided; exactly what was disclosed, to whom, and when;
whether the user was told, and if not, why; and what advice was taken.

This record is the only evidence that the disclosure was lawful and proportionate. It is also the
only way to answer the same authority's next request consistently.

---

## What both procedures depend on that is currently weak

Recorded here rather than left implicit, because these are the things that would make a real
incident go badly, and each is a decision rather than a bug.

1. **One person holds Azure subscription access**, which is equivalent to reading everything. There
   is no second party to escalate to for a breach involving that access. Tracked in the legal pack
   and #137.
2. **Reads are not audited.** The most likely High-severity breach is unreconstructable, and every
   lawful-request record must be written by hand. A read audit for administrative access to
   another person's self-assessment content would change both procedures materially.
3. **No monitored detection for misuse.** Sentry catches errors; a successful unauthorised read is
   not an error.
4. **No monitored contact address** for someone outside to report a vulnerability or a leak. Today
   a well-intentioned report might reach a general inbox and sit there.
5. ✅ **The Data owner and Spokesperson posts are filled** (2026-09-01). What remains is that
   the Spokesperson and the Operator are the same person — see the note under Roles for the
   interim position when a breach involves the operator's own access.

## To confirm in the legal review

- Breach: threshold, timeline, who must be told — legal pack **question 6**
- Lawful request: prescribed procedure, what may be refused, whether the user may be told — legal
  pack **question 7**
- Whether a vratmitra's notes *about* a person are in scope of a request for *that person's* data
- Whether backups (30-day dumps, 35-day managed) change any notification obligation
- Whether the absence of read auditing must itself be disclosed to a regulator when scope cannot
  be established

## Related

`ops/data-map.md` (what data exists and where) · `ops/legal-briefing-pack.md` (questions 6 and 7) ·
`DEPLOYMENT.md` (restore runbook, and the `stop-veervrat` runbook) · #143 (incident response and
platform shutdown) · #137 (access and ownership register) · #75 (no supported way to administer
data in a deployed environment)
