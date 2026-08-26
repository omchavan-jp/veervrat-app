# Veervrat — data-protection briefing

**For review with Rahul Dharmadhikari.** Prepared 2026-08-25 by Om Chavan for Jnana Prabodhini.

This document is written to be read on its own. It assumes no familiarity with the software, and
every technical term is expanded where it first appears.

---

## 1. What we are asking for

Two things, and deliberately not a third.

1. **A review of the privacy policy and terms of use before the platform opens to users.** Both
   documents exist and are published in English and Marathi. They have not been reviewed by a
   lawyer.
2. **Answers to the ten questions in section 8.** They are the points where we have made a
   judgement and would rather have it checked than defended later.

**We are not asking for a full compliance audit.** If the review suggests one is warranted, that
is useful to know, but the immediate need is narrower: we are about to invite a small number of
real people to use this, and we do not want to collect their data on the basis of assumptions.

---

## 2. What Veervrat is

A web platform built for Jnana Prabodhini supporting a personal-development practice. A
participant — a **vratarthi** — assesses their own character weaknesses, works on them through
structured exercises, writes private reflections, and is guided by a mentor, a **vratmitra**, who
can see that participant's material.

It is free, non-commercial, and run by a nonprofit. There is no advertising, no sale of data, and
no third-party analytics.

**It is restricted to adults, 18 and over.** Section 7 covers how, and why we chose that method.

The platform is not yet open. A small closed group of testers is the next step, which is what
makes this review timely.

---

## 3. The personal data held

Recorded from the database schema and the source code, not from memory.

### 3.1 Identity

Email address (also the login identifier), display name, username (public, appears in profile
addresses), optional gender, preferred language, and **date of birth**.

Date of birth is required when the account is created, is validated as 18 or over before the
account exists, and is **never displayed** — not on a profile, not to anyone. It functions as an
identity-verification token, so publishing it would hand out a credential.

### 3.2 Credentials

A password, stored only as a bcrypt hash. For those who sign in with Google, a stable Google
account identifier instead.

### 3.3 Consent records

Which policy document a person accepted, at which version, and when — written in the same
transaction as the account, so an account cannot exist without one.

### 3.4 Technical and behavioural

Session records (IP address, browser user-agent, expiry), an audit log of administrative actions
(who did what, IP address, user-agent), and product-feedback submissions (which include the
reporter's identity and the page they were on).

### 3.5 The sensitive core — and it is not the obvious category

This is the part that matters most, and it is easy to overlook because none of it looks like
"personal data" in the conventional sense:

- **Self-assessments** — a person's own record of their character weaknesses, scored by them.
- **Journeys** — what they are working on, and their progress against it.
- **Experience logs** — free-text personal reflection.
- **Mentor notes** — a vratmitra's written observations *about* that person.
- **Private messages** between a vratarthi and their vratmitra.
- **Uploaded images**, attached to reflections or sent in those messages.

A person's self-assessed weaknesses, together with their mentor's notes about them, are more
sensitive than their email address. A policy that protects the email and ignores this has
protected the wrong thing.

---

## 4. Where the data physically lives

All of it in **Microsoft Azure, Central India (Pune)** — the database, the cache, the uploaded
files, the secrets, and the application logs (which contain IP addresses and user-agents, held
for 30 days).

**One exception.** Error diagnostics go to **Sentry, hosted in the EU (Frankfurt)**. Sentry is an
error-reporting service; when the software fails, it records what went wrong so it can be fixed.
It offers EU or US hosting only — there is no India region. The EU was chosen deliberately.

What is sent: the error message, the technical stack trace, the request method and page address,
and the software version. The service is configured **not** to attach cookies, headers, IP
addresses or user records, and a filter removes email addresses and long tokens from error text
before it leaves our servers.

What remains possible: a stack trace can incidentally include an identifier that appears in a
page address, and a filter is a filter, not a proof. We treat Sentry as holding a small amount of
incidental personal data rather than none. Retained 30 days.

Our own reading is that this is lawful — the DPDP Act 2023 permits cross-border transfer except
to countries the government notifies as restricted, and none have been notified. We disclose it
in the privacy policy in both languages. **Question 10 asks whether that reading is right.**

Email is sent through Jnana Prabodhini's own mail relay. The relay operator sees message
metadata, not application data.

---

## 5. Who can reach the data

- **Administrators** — a dashboard allowing user search, viewing account details, granting roles,
  suspending accounts, forcing sign-out, and anonymising an account. Every action is recorded in
  the audit log.
- **One operator** — Om Chavan holds the Azure subscription access. That access is, in practice,
  equivalent to being able to read every secret and every record.
- **Jnana Prabodhini's IT** — controls the domain names and the mail relay. Sees mail metadata,
  not application content.
- **Vratmitras** — see their assigned vratarthi's material by design. This is a product
  relationship, not an administrative one, and question 8 is about how it should be framed.

⚠️ The concentration in a single operator is a real risk to the organisation and is being tracked
separately. It is not a question for this review unless you think it should be.

---

## 6. What "delete my account" does today

A person can delete their own account, and an administrator can anonymise one. Both run the same
operation.

**Cleared:** display name, email address, username, profile image reference, date of birth,
gender, any pending email change, and the password hash.

**Retained deliberately, each with a reason:**

| Retained | Why |
|---|---|
| The Google account link | So a deleted account cannot be silently recreated and reattached to the same person. Disclosed in the privacy policy |
| All content, under a pseudonym | A product decision: a vratmitra's record of their own guidance should not develop holes. The content stays; the identity attached to it does not |
| Audit log entries | A security record that legitimately outlives the account it describes |
| Uploaded image files | The reference is cleared, but no stored file is ever deleted — see below |

**Two gaps we already know about, stated rather than discovered by you:**

- **No stored file is ever deleted**, under any circumstance. Images uploaded and then removed
  from a reflection, or belonging to a deleted account, remain in storage indefinitely.
- **There is no retention policy at all.** Nothing expires except by explicit action. Session
  records were the one exception and are now cleared nightly once expired.

---

## 7. The 18+ restriction, and how it is enforced

**The platform is strictly adults-only.** This is stated in the terms, declared by the user at
account creation, and recorded with a timestamp.

**Age is self-declared, and we have decided that is sufficient.** The reasoning, which question 1
asks you to check:

Document checks, payment-card verification and third-party age-assurance services all collect
substantially *more* sensitive information than they protect — identity documents, card details,
or a facial scan — for a platform about private personal reflection. Adopting one would make the
privacy position worse, not better.

We therefore treat the obligation as met by: stating the restriction plainly, requiring the date
of birth before the account exists, recording the affirmation, and acting when we learn an
account does not qualify — including an administrative route to remove it.

**Consequence worth stating:** because the platform is adults-only, the DPDP Act's provisions
concerning children's data are outside scope. That is the single largest simplification in our
position, and it rests entirely on the judgement above. If self-declaration is not sufficient,
much of the rest changes.

We do not ask Google for a date of birth when someone signs in with Google: it requires a
sensitive permission scope, frequently returns nothing, and would mean collecting more to verify
the same claim.

---

## 8. The questions

1. **Is self-declared age sufficient** for an 18+ restriction on a platform of this kind, given
   the reasoning in section 7?
2. **Does the DPDP Act 2023 apply** to a nonprofit operating a free platform of this kind, and in
   what capacity — data fiduciary, or something else? What follows from that?
3. **Retention.** How long may audit log entries and IP addresses be kept, and what must be
   justified? We currently keep them indefinitely, which we assume is wrong.
4. **What must "delete my account" mean** in law, against what it currently does (section 6)? In
   particular: is retaining content under a pseudonym defensible, and is retaining the Google
   account link defensible given we disclose it?
5. **Access and portability.** A person can already download their own data as a machine-readable
   file: identity fields, consents, self-assessments, journeys, reflections, private messages in
   both directions, mentor notes about them, blog posts and comments.

   Two things are **excluded**, deliberately: the password hash, which is never returned to
   anyone; and the audit log, on the reasoning that it records what an *administrator* did rather
   than being primarily the person's own data. **Is that second exclusion defensible?** It is the
   one we are least sure of.
6. **Breach notification.** What thresholds, what timeline, and who must be told — the regulator,
   the affected people, or both?
7. **A court or police request for user data.** Is there a required procedure? We have none, and
   would rather write one before it is needed than during.
8. **Mentor visibility.** A vratmitra reads another adult's private self-assessments and
   reflections. Both are adults and both consent to the arrangement within the product. How
   should this be framed in consent terms, and is anything more than the current in-product
   agreement required?
9. **User-authored public content.** Participants may publish reflections and blog posts
   publicly. Does operating that create publisher obligations for the organisation, and what
   moderation duty follows?
10. **The EU transfer** described in section 4 — is our reading correct, and is disclosure in the
    privacy policy sufficient?

*(Question 10 was added when this pack was assembled; the original list had nine. The transfer is
the only place data leaves India, so it seemed worth asking directly rather than leaving it as an
assertion in section 4.)*

---

## 9. What accompanies this document

- **The privacy policy and terms of use**, currently at version 2, in English and Marathi. These
  are the documents we are asking you to review.
- **The data map** — the fuller internal record from which section 3 is drawn, available if the
  detail is useful.

---

## 10. What we have already decided, so it need not be re-opened

Listed so the review can focus on what is genuinely open:

- The platform is adults-only. *(How that is enforced is question 1; the decision itself is not
  in question.)*
- Content is retained under a pseudonym after deletion rather than erased.
- Data is stored in India, with the single Sentry exception disclosed in section 4.
- Age is not verified through documents or a third-party service.

If any of these are wrong in law rather than merely debatable in judgement, that is exactly what
we need to hear.
