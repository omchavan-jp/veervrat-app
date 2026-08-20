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

## Open questions — genuinely open, to settle before implementing

1. **Is a document-request round trip acceptable?** It is the price of C2. Measurable first:
   warm api is ~40ms, so on a warm path this is minor; on a cold start it is seconds (#92, where
   we deliberately declined to pay for always-on replicas). These two decisions interact.
2. **What happens when seeded state and client state disagree?** A session can expire between the
   HTML being rendered and the user clicking. Proposal: the client query is authoritative for
   *changes*; seeded state is the initial value only, never re-applied.
3. **Do the layout guards disappear or merely change?** They still need to handle sign-out during
   a session. Likely they stop gating *first render* while keeping a redirect for state changes.
4. **Does this deprecate the `NEXT_LOCALE` fast path?** If auth is resolved on document requests,
   `language` comes with it and the cookie becomes a cache of something already known. Possibly a
   simplification worth taking, possibly an unnecessary coupling of two concerns.
5. **Does any of this change what an unauthenticated visitor costs?** For anonymous users there is
   no session cookie, so no `/auth/me` call is made at all — the fast path already short-circuits.
   That is worth confirming rather than assuming, since public pages are the most-hit.

## Risks

- **Touches authentication.** A mistake locks everyone out rather than degrading quietly.
  Verification must be a real browser: sign in, reload, expire mid-session, sign out, and a
  private window for the anonymous path. `curl` cannot see any of this (#101 was invisible to it).
- **Latency regression is the likeliest way this goes wrong**, and it would land on every page
  load — far more visible to users than the structural problem being fixed.
- **Seeded/live divergence** is the subtle one: an auth state that is correct at render and stale
  a second later.
