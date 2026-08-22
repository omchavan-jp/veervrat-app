## Carrying date of birth through the Google round trip

The signup form collects date of birth and consent, then the browser leaves for Google and comes
back. Something has to hold that data across the round trip.

**Rejected: putting it in the OAuth `state` parameter.** `state` travels in URLs — it lands in
server access logs, browser history, and potentially a referrer header. A date of birth is an
identity-verification token; it should not be sitting in a query string on three systems.

**Chosen: a short-lived pending-signup record, server-side.** The form posts date of birth and
consent, the server stores them against an opaque identifier, and only that identifier travels in
`state`. On return, the record is looked up, used, and deleted. It expires in minutes — long
enough for a Google round trip, short enough that abandoned signups do not accumulate.

This also gives the sign-in path something concrete to check: **no pending record and no existing
account means someone reached Google sign-in without signing up**, which is exactly the case that
must not create anything.

## Why the split is in the flow, not in a later check

The alternative — one Google endpoint, then a blocking step afterwards — was rejected because the
account already exists by then. Under an 18+ policy that means holding a record for someone the
platform is not for, and then having to delete it. The gate has to come before creation, which
means the intent has to be known before the redirect.

Two entry points, distinguished at the start:
- signup → pending record exists → create on return
- sign-in → no pending record → authenticate only, never create

Account linking from settings is a third case and is unchanged: the user is already
authenticated and the account already exists.

## Consent records

Two pieces, deliberately separate from the document content.

**Version on the document.** The content already lives in `CmsPage`, admin-editable. What is
missing is a version that an administrator bumps when a change is material. Automatic versioning
on every edit would re-prompt every user for a typo fix; deciding materiality is a human
judgement and should stay one.

**A record per user, per document, per version** — who accepted what, and when. Not a boolean on
the user: a boolean cannot answer "did they agree to *this* version", which is the only question
that matters when the terms change.

**Written in the same transaction as the account.** A crash between creating the user and
recording consent leaves an account whose agreement has no record — the one state that cannot be
repaired, because there is nothing to reconstruct it from.

## Age check

Compare date of birth to the current date at account creation and require 18 years. Store the
date, not the computed age — age changes and dates do not, and storing a derived value that
silently goes stale is worse than storing nothing.

**The check runs server-side.** The form should also check, so the user is told immediately
rather than after a round trip, but the client is never the gate.

## What the profile shows

| Field | On the profile |
|---|---|
| `gender` | Shown when provided; absent when blank |
| `dob` | **Never.** Not shown, not returned by the public profile API |

Removing `dob` from the public-profile response is part of this change. It is currently returned
and rendered nowhere, which is the quietest kind of exposure — an API returning a
identity-verification token that no interface asked for.

## Sequencing against the user wipe

Making `dob` required is a schema change against a table with existing rows whose values are
null. Because every user is disposable, the order is: **ship, then delete all users** — no
backfill, no default value standing in for a real answer, and no accounts whose age is unknown
being treated as though it were known.
