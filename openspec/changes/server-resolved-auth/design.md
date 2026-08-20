## Context

Verified in code before designing anything:

- `proxy.ts` fetches `/auth/me` server-side and keeps only `language`. The full user is already
  in hand and discarded.
- That fetch is **skipped** whenever a valid `NEXT_LOCALE` cookie exists — a deliberate fast path
  added to remove a per-request cross-service round trip.
- Four layout guards gate rendering on `isLoading`; **18** components call `useAuth`.
- No server component reads `cookies()` today, so there is no existing server-side auth path to
  extend — this introduces the first one.
- The session cookie is `veervrat_session`, HttpOnly. The browser cannot inspect it; only the api
  can say what it means.

## Goals / Non-Goals

**Goals**
- Initial auth state arrives with the HTML.
- Layouts stop gating first render on an in-flight query.
- The mount/unmount feedback shape that produced #101 becomes structurally impossible.

**Non-Goals**
- Changing how sessions are created, stored or validated. The api stays the authority.
- Server-side route protection (separable; see proposal).
- Removing the client query — it is still needed for changes.

## The central trade-off

Resolving auth server-side means the web tier must know what the session cookie means. Only the
api knows. So *something* must ask it, and the question is how often and at what cost.

### Option A — call `/auth/me` from middleware on every request

Simple and always correct: one authority, one answer, no duplicated truth.

**Cost:** a cross-service round trip on **every** page load, including client-side navigations
that trigger middleware. This is exactly what the `NEXT_LOCALE` fast path was introduced to
avoid, and the CHANGELOG records the improvement as user-visible ("Language switching is now
instant"). On a cold api it compounds with #92: the request cannot start until a container boots.

Re-adding a known-removed latency, to fix a structural problem the user cannot see, is a poor
trade unless the cost is genuinely small — and on a Burstable-tier cross-service hop it is not.

### Option B — verify the session locally, without calling the api

Give the web tier a way to check the cookie itself: a signed token it can verify with a shared
secret, or a public key.

**Fast** — no round trip at all. **But** it duplicates the definition of a valid session across
two services. The failure mode is subtle and serious: revocation. Logout, password reset and
admin force-logout all invalidate server-side sessions, and a locally-verified token keeps
looking valid until it expires. The app currently deletes sessions on password reset precisely so
they stop working immediately — Option B silently weakens that guarantee.

That is a real auth-architecture change with a security consequence, not an optimisation. It
should not be adopted as a side effect of a rendering fix.

### Option C — seed on document requests only; keep the client query for the rest

Resolve server-side when serving **HTML** (the case where the flash and the extra round trip
actually occur). Client-side navigations reuse the already-seeded state; the client query handles
*changes*.

**Cost:** two paths to the same fact, which must not disagree. That is the risk to design against
— and it is a smaller, more contained risk than either re-adding latency everywhere (A) or
duplicating session truth (B).

It also fits what already exists: middleware runs on document requests, `RuntimeConfigProvider`
already carries server-resolved values to the client, and the locale fast path shows the pattern
of "resolve server-side, cache, self-heal" already working here.

### Leaning: **Option C**, with one deliberate refinement

Fold the auth resolution into the locale resolution that already happens, rather than adding a
second call. Today the fast path skips `/auth/me` when `NEXT_LOCALE` is cached — meaning locale is
cached but auth would not be. Two possibilities, and this is the main open question:

- **C1** — seed auth only when the middleware already calls `/auth/me` (cache miss). Zero added
  latency, but auth is seeded inconsistently, which is worse than not seeding at all: components
  cannot rely on it and must keep the loading path anyway.
- **C2** — always resolve auth on document requests, and let locale ride along (it is in the same
  response). Adds the round trip back on document requests **only** — not on client navigations,
  which are the common case in an SPA-ish app. Auth is then reliably present, so guards can drop
  the loading path entirely.

**C2 is the honest version.** C1 keeps the latency win but delivers none of the structural
benefit, because "sometimes seeded" still requires every consumer to handle "not seeded".

## Decisions taken 2026-08-20

**Chosen: C2 — resolve the session on every document request, and pay the round trip.**

Rejected B (local token verification) on security grounds rather than performance: logout,
password reset and admin force-logout invalidate sessions *immediately* today, and a locally
verified token would keep working until it expired. Trading that away to save latency is the
wrong direction for an auth change.

Rejected C1 (seed only on a locale cache miss) because "sometimes seeded" still forces all 18
consumers to keep a not-seeded path — the latency saving with none of the structural benefit.

The cost is bounded and now understood: **signed-in users only, document requests only**.
Anonymous visitors are untouched, so the public pages that get the most traffic are unaffected.
Warm that is ~40ms; cold it is seconds, which is a consequence of scale-to-zero (#92) rather than
of this change — and worth revisiting there, not here.

### Consequence: the `NEXT_LOCALE` fast path narrows

Today the cookie lets middleware skip `/auth/me` entirely. Once auth must be resolved on every
document request for signed-in users, that skip no longer applies to them — `language` simply
arrives with the user object. The cookie remains useful for **anonymous** visitors (who never had
an `/auth/me` call) and as the mechanism for instant client-side switching, so it stays; it just
stops being an auth-avoidance mechanism.

This is a simplification worth taking deliberately: two concerns (locale caching and auth
avoidance) were coupled in one cookie, and this separates them.

## Open questions — resolved

**Q2 — what if seeded state and client state disagree?**
Seeded state is the **initial value only** and is never re-applied. The client query remains
authoritative for *changes*: login, logout, expiry mid-session. A session that expires between
HTML render and the next click is handled the way it is today — the api rejects the request and
the client updates. Re-applying seeded state on any later render would resurrect stale auth,
which is the one genuinely dangerous failure mode here.

**Q3 — do the layout guards disappear?**
They stop gating **first render**, since there is no initial loading state to gate on. They keep
their **redirects**, which handle state *changes* — signing out in one tab, or a session expiring
while the app is open. So the guards shrink rather than vanish, and the mount/unmount feedback
shape that caused #101 goes with the loading branch.

**Q4 — does this deprecate the `NEXT_LOCALE` fast path?**
No — see above. It narrows to anonymous visitors and to instant client-side switching, which is
what it is actually good at.

## Previously open, answered during the design

1. ~~**Does this change what an unauthenticated visitor costs?**~~ **Answered — no.**
   `resolveLocale` returns early when `veervrat_session` is absent, so no `/auth/me` call is made
   for anonymous visitors and none would be added. The latency cost of C2 therefore falls **only
   on signed-in users, and only on document requests** — which materially improves the trade-off,
   since public pages are the most-hit and are unaffected.

## Risks

- **Touches authentication.** A mistake locks everyone out rather than degrading quietly.
  Verification must be a real browser: sign in, reload, expire mid-session, sign out, and a
  private window for the anonymous path. `curl` cannot see any of this (#101 was invisible to it).
- **Latency regression is the likeliest way this goes wrong**, and it would land on every page
  load — far more visible to users than the structural problem being fixed.
- **Seeded/live divergence** is the subtle one: an auth state that is correct at render and stale
  a second later.
