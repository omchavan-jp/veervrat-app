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

## The date-of-birth field

**Default position: today minus eighteen years.** The picker opens on the most recent date that
qualifies, so the common case — someone comfortably over eighteen — starts near where they need
to be, and the boundary is visible without being announced.

**That same date is the maximum.** Later dates are disabled.

**How the constraint is communicated**, in three layers, because relying on one is fragile:

1. **A persistent hint under the field**, before anyone tries: *"Veervrat is for adults aged 18
   and over."* Stating a rule up front is better than only enforcing it after a failed attempt.
2. **Disabled dates stay reachable.** `aria-disabled` rather than `disabled`, because disabled
   controls frequently do not emit click events and are skipped by screen readers — a tooltip
   attached to one is unreliable in exactly the cases that need it most.
3. **An inline field error on submit**, at the field, not a toast. A toast is transient and
   detached from the thing that caused it; this is a field constraint and belongs with the field.

The server validates independently. The client-side rules exist so the person is told
immediately, never so the check can be skipped.

## Where the acceptance wording comes from

The **mechanism** ships here — the checkbox, reading the current version, and writing the consent
record. It cannot wait, because consent must exist from the first account onward and cannot be
reconstructed later.

The **content** — the terms and privacy text, and the refined wording around acceptance — comes
from #81. The sequence in §9 keeps these consistent: ship the mechanism, write the content,
publish both documents at version 1, and only then create real accounts. Because every existing
user is being deleted as part of this change, nobody ever accepts a placeholder.

