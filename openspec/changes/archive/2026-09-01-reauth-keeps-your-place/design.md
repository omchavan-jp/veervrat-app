## Context

Verified in the code before designing, not recalled.

- `settings/page.tsx` holds `deleteOpen` (a `Dialog`) and `emailForm` (an inline form) in
  `useState`. The Google round trip is a **full page load**, so both are gone on return.
- The verification link is a plain anchor to
  `${apiBaseUrl}/auth/google?intent=reauth` — the browser leaves the app entirely.
- `GoogleOAuthGuard.getAuthenticateOptions` sends `state: 'reauth'`, a **fixed literal**.
- The callback matches `state === REAUTH_STATE`, stamps the session, and redirects to
  `/settings?reauth=ok` or `?reauth=wrong_account`.
- `reauthed` is read **once** into state from the query string, deliberately: the proof is
  single-use and expires in minutes while a query parameter does neither, so the page must be able
  to stop believing it (fixed 2026-08-29, and not to be undone here).

So two distinct things are lost, and they are not the same kind of thing.

| Lost | What it is |
|---|---|
| *which flow* you were in | a choice between two known options |
| *what you had typed* | **an email address — personal data** |

## Goals / Non-Goals

**Goals**
- Come back to the flow you left, already open.
- Keep what you had entered.
- Say that verification succeeded, rather than leaving it to be discovered.
- Handle `wrong_account` in the same place, with the same care.

**Non-Goals**
- Changing what the proof is, how long it lasts, or that it is single-use.
- Avoiding the full-page round trip. An OAuth redirect is how this works; a popup would be a
  different change with its own failure modes.
- Restoring a *password* field. Accounts with a password never take this path, and a password
  should not be stored anywhere to survive a redirect.

## Decisions

### 1. Which flow travels in the OAuth `state`. What was typed does not.

`state` becomes `reauth:delete` or `reauth:email`, from a fixed allowlist, and the callback echoes
the flow back as `/settings?reauth=ok&flow=delete`.

**What was typed must never go in `state`.** The guard's existing comment already records why, for
a different value:

> Those would end up in access logs, browser history and referrer headers, and a date of birth is
> an identity-verification token.

An email address the person is moving to is the same kind of value. It would travel to Google, sit
in the redirect URL, and land in server logs — to save one field of retyping. So the draft stays in
the browser, in `sessionStorage`, and never leaves it.

**Considered and rejected: putting the flow in `sessionStorage` too.** It would work and need no
API change. Rejected because the flow is what decides *what the person is shown on return*, and
`sessionStorage` is empty in exactly the cases where being shown the wrong thing is worst — a new
tab, a restored session, a browser that clears site data. A server-mediated value is present
whenever the redirect is, which is precisely when it is needed. The draft is different: if it is
missing, the field is simply empty, which is what happens today.

**Allowlist, not free text.** The callback matches `reauth:<flow>` against a known set and ignores
anything else. `state` comes back from Google and is therefore attacker-influenceable in principle;
it must not be able to make the settings page render an arbitrary string or open something that is
not one of these two flows. It carries no secret and needs none — what the callback trusts is the
session cookie and the Google identity, which is unchanged.

### 2. The draft lives in `sessionStorage`, keyed and short-lived

`sessionStorage`, not `localStorage`: it is scoped to the tab and cleared when the tab closes,
which matches how long a half-finished email change is worth keeping. `localStorage` would leave
the address someone was moving to sitting on a shared machine indefinitely.

Cleared as soon as it is read back, and on a successful change. A draft that outlives its flow is
just a stale value waiting to be restored into the wrong context.

⚠️ Every read and write is wrapped: private windows, blocked site data and thumbnail contexts all
throw on access. A page that fails to restore a draft must still render — the cost of missing it is
retyping one field, which is today's behaviour.

### 3. Returning says what happened, in the flow, not on the page behind it

On return the page reopens the flow and shows the outcome inside it — verified, or verified as the
wrong account. Not a toast on the settings page behind the dialog, which is what "the page looks
untouched" already is.

`wrong_account` is treated as a first-class outcome rather than an edge case: it is what happens
when somebody has two Google accounts and the browser is signed into the other one, which is
common and is not a mistake in the system's terms.

### 4. What must not regress

The 2026-08-29 fix stands: `reauthed` is read **once** into state, and the server dropping the
stamp must still be able to clear it. Restoring intent must not reintroduce a page that goes on
claiming "verified" from a URL that never expires — that defect signed people out for mistyping
their own password and took a browser session to find.

## Risks / Trade-offs

- **The draft is written to the browser before leaving.** Scoped to the tab, cleared on read,
  never transmitted. The alternative — retyping — is what happens today, so failure is a return to
  the status quo rather than a new harm.
- **`state` gains structure.** A fixed prefix and an allowlisted suffix; anything unrecognised
  falls back to today's behaviour of landing on settings with the proof held.
- **Two flows are hardcoded.** A third would need adding in both places. That is a real cost and
  the honest alternative — free-form intent — is what the allowlist exists to prevent.
