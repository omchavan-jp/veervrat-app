## 0. Read first

- [x] 0.1 `design.md` in this change — particularly why option B (local token verification) was
  rejected on **security** grounds. If implementation pressure makes it tempting again, that is
  the section to re-read, not to work around.
- [x] 0.2 `documentation/21_Infrastructure-Conventions.md` §17 — the build-time vs runtime rule.
  Seeded auth travels the same server→client channel and is subject to the same trap.

## 1. Resolve the session server-side

- [x] 1.1 In `proxy.ts`, keep the whole user from the existing `/auth/me` call instead of
  discarding everything but `language`. The fetch already happens; today its result is thrown
  away.
- [x] 1.2 Remove the `NEXT_LOCALE` short-circuit **for requests carrying a session cookie** — auth
  now has to be resolved for them. Keep the fast path for anonymous visitors, who never triggered
  an `/auth/me` call and must not start.
- [x] 1.3 Pass the resolved user to the app. Options: a request header (as `X-Next-Locale` already
  is) or reading the cookie again in a root server component. Prefer the header — it reuses the
  established pattern and keeps one lookup.
- [x] 1.4 A failed or slow `/auth/me` must degrade to **anonymous**, never to an error page. The
  api being down should log you out visually, not break the site.

## 2. Seed it into the client

- [x] 2.1 Extend the runtime-config channel to carry the initial user (`RuntimeConfigProvider`
  already does exactly this job for other server-resolved values).
- [x] 2.2 Seed the TanStack Query cache with it at the `auth.me` key, so `useAuth` returns it
  immediately with no fetch and no loading state on first render.
- [x] 2.3 Seed as **initial data only**. It must never be re-applied on later renders — that would
  resurrect a stale session after logout, which is the one dangerous failure mode here (design Q2).

## 3. Simplify the guards

- [x] 3.1 Remove the `isLoading` branch from the four layout guards (`(public)`, `(app)`,
  `(content)`, `(onboarding)`). There is no initial loading state left to gate on.
- [x] 3.2 **Keep** the redirects — they handle state *changes* (sign-out in another tab, session
  expiry mid-session), which seeding does not address.
- [x] 3.3 Confirm no guard still unmounts its subtree on an auth transition. That mount/unmount
  shape is what made #101 possible; removing it is the structural point of this change.

## 4. Verification — a real browser, every time

`curl` cannot see any of this. #101 was invisible to it because curl does not run JavaScript.

- [x] 4.1 Signed in: full page load shows content immediately — **no spinner flash**.
- [x] 4.2 Anonymous: `/login` still renders fast, and DevTools shows **no** `/auth/me` call.
- [ ] 4.3 Sign out in one tab, act in another — the second tab redirects rather than acting as a
  ghost session.
- [ ] 4.4 Expire a session server-side mid-session; confirm the next action redirects to login
  rather than silently failing.
- [x] 4.5 Re-run the #101 guard: `e2e/auth-no-request-storm.spec.ts` must still pass.
- [x] 4.6 Measure the added latency on a warm api and record the number. If it is materially worse
  than the ~40ms observed, say so rather than shipping it quietly — the whole decision rests on
  that figure.

## 5. Ship and document

- [x] 5.1 Merge; verify on UAT with §4 against the deployed build.
- [x] 5.2 Update `documentation/13_Frontend-Conventions.md` — auth is seeded, not fetched, on
  first render; `useAuth` is for changes.
  Done 2026-08-27: §4 "What goes where" table and §5 "State management" updated with seeding
  explanation, null-seed danger, and invalidation behaviour.
- [x] 5.3 Update `openspec/specs/auth` with the seeded-initial-state requirement.
  Done 2026-08-27: "Auth state: seeded, not fetched" section added to `openspec/specs/auth/spec.md`.
- [x] 5.4 Note in #92 that cold-start latency now affects signed-in page loads too — it makes the
  always-on replica trade-off more favourable than when it was declined.
- [x] 5.5 CHANGELOG: user-visible (pages no longer flash a spinner before showing content).
- [ ] 5.6 Archive this change.


---

## Measured latency (task 4.6)

The decision to pay the round trip rested on an assumed ~40ms. Measured locally against a warm
api, three runs each:

| | |
|---|---|
| anonymous document request (no `/auth/me`) | 31–35ms |
| signed-in document request (with `/auth/me`) | 44–47ms |
| **added cost** | **~12ms** |
| the `/auth/me` call itself | 7–10ms |

Comfortably better than the figure the decision assumed. Two caveats worth stating rather than
burying: this is a local same-host hop, so a deployed cross-service call will be higher; and it
says nothing about a **cold** api, where the cost is seconds — that is #92's territory, and this
change makes that trade-off more consequential, since cold start now delays signed-in page loads
rather than only first paint.

## Verification results

- anonymous `/forgot-password`: **0** client `/auth/me` calls (was 1311 in 8s at the peak of #101)
- signed-in reload: **0** client `/auth/me` calls — fully seeded
- `/login` interactive in 187ms
- the #101 storm guard (`e2e/auth-no-request-storm.spec.ts`) still passes
- 139 unit tests, lint clean, build clean

Still outstanding — needs a deployed environment or two browser tabs:

- **4.3** sign out in one tab, act in another
- **4.4** expire a session server-side mid-session

> **Status 2026-08-22 — verified rather than assumed.**
>
> Ticked: 5.1 (merged and deployed across the auth fixes), 5.4 (#92 carries the note that cold
> start now affects signed-in page loads), 5.5 (CHANGELOG carries both entries).
>
> **Still genuinely open, and not ticked:**
> - 4.3 / 4.4 — the dead-session behaviour was exercised on UAT and the redirect was confirmed,
>   but only for pages that make an authenticated request. Pages that make none never notice the
>   session has ended, which is recorded on #116. Leaving these open reflects that.
> - 5.2 — `documentation/13_Frontend-Conventions.md` still does not describe auth as seeded
>   rather than fetched. Checked: no mention of the seeding or the session header.
> - 5.3 — there is no `openspec/specs/auth` spec file to update.
> - 5.6 — archive only once the above are resolved.

