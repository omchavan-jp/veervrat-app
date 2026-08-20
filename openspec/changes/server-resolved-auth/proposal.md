## Why

**The app treats "who is signed in" as client state to be fetched, when it is request context the
server already has.**

The session lives in an HttpOnly cookie the browser cannot read. So every client fetch of
`/auth/me` is the browser asking the server to tell it something the server knew before sending
a byte of HTML. Meanwhile `proxy.ts` *already* fetches the full user server-side — and keeps
only one field:

```ts
const body = (await res.json()) as { data?: { language?: string } };
```

The whole user object is in hand, server-side, before rendering. It is discarded, and then
fetched again from the browser.

### What that premise costs

Because auth is a query, it has a **loading state**. Because it has a loading state, layouts gate
rendering on it. Because they gate on it, subtrees mount and unmount as auth resolves:

```ts
if (isLoading) return <spinner/>;
return <>{children}</>;
```

That is what made the request storm possible (#101, fixed): an errored query refetches on every
fresh mount, so children mounting re-triggered the fetch that unmounted them — ~200 requests a
second until the rate limiter intervened. The trigger is gone; **the shape is not**. Four layout
guards still do this and there are **18 `useAuth` consumers**.

The same premise also produces a spinner-then-content flash on every full page load, and a
second network round trip before the app can render anything meaningful.

## What Changes

**1. The session is resolved once, server-side, and seeded into the client.**
`RuntimeConfigProvider` already carries server-resolved values across that boundary and is the
natural vehicle.

**2. Layout guards stop gating on a loading state that no longer exists for the initial render.**
The first paint is already correct rather than a spinner that resolves into content.

**3. The client query remains — for *changes*, not for initial truth.**
Login, logout and mid-session expiry are still client events. This is **server-seeded,
client-updated**, and saying so plainly matters: "server-only auth" would be wrong and would
break the moment a session expires in an open tab.

### Explicitly not in scope

- **Changing how sessions are stored or validated.** The api remains the authority. This is about
  where the answer is *read*, not how it is *decided*.
- **Removing `useAuth`.** Consumers keep their hook; it stops being the source of initial truth.
- **Route protection.** Server-side redirects for unauthorised access are a natural follow-on but
  a separable change; doing both at once conflates "who are you" with "may you be here".

## ⚠️ The complication this change exists to resolve carefully

The middleware call is **not** made on every request. There is a deliberate fast path:

```ts
// Fast path: a NEXT_LOCALE cookie skips the per-request /auth/me round-trip
// (which added cross-service latency to EVERY page load).
```

That round trip was **deliberately optimised away** — see "Language switching is now instant" in
CHANGELOG. Naively resolving auth server-side on every request reintroduces precisely the latency
that was removed, on a cross-service hop, and it is worst exactly when the api is cold (#92).

**So this change is not free, and pretending otherwise would repeat the mistake it fixes.** The
design must choose deliberately between paying that cost, avoiding it, or scoping it — see
`design.md`.

## Impact

- Affected specs: `auth`
- Affected code: `apps/web/proxy.ts`, `lib/runtime-config.ts` + provider, four layout guards
  (`(public)`, `(app)`, `(content)`, `(onboarding)`), `hooks/use-auth.ts`, and the 18 consumers
  that read it
- **Touches authentication**, so a mistake locks everyone out rather than degrading quietly. The
  verification bar is a real browser: sign in, reload, expire a session mid-session, sign out.
- **Adds latency to page loads unless deliberately avoided.** This is the central trade-off, not
  a footnote.
- Reduces one network round trip *within* the page load, and removes the initial spinner.
