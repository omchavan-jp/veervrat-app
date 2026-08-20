## 0. Read first

- [ ] 0.1 `design.md` in this change — particularly why option B (local token verification) was
  rejected on **security** grounds. If implementation pressure makes it tempting again, that is
  the section to re-read, not to work around.
- [ ] 0.2 `documentation/21_Infrastructure-Conventions.md` §17 — the build-time vs runtime rule.
  Seeded auth travels the same server→client channel and is subject to the same trap.

## 1. Resolve the session server-side

- [ ] 1.1 In `proxy.ts`, keep the whole user from the existing `/auth/me` call instead of
  discarding everything but `language`. The fetch already happens; today its result is thrown
  away.
- [ ] 1.2 Remove the `NEXT_LOCALE` short-circuit **for requests carrying a session cookie** — auth
  now has to be resolved for them. Keep the fast path for anonymous visitors, who never triggered
  an `/auth/me` call and must not start.
- [ ] 1.3 Pass the resolved user to the app. Options: a request header (as `X-Next-Locale` already
  is) or reading the cookie again in a root server component. Prefer the header — it reuses the
  established pattern and keeps one lookup.
- [ ] 1.4 A failed or slow `/auth/me` must degrade to **anonymous**, never to an error page. The
  api being down should log you out visually, not break the site.

## 2. Seed it into the client

- [ ] 2.1 Extend the runtime-config channel to carry the initial user (`RuntimeConfigProvider`
  already does exactly this job for other server-resolved values).
- [ ] 2.2 Seed the TanStack Query cache with it at the `auth.me` key, so `useAuth` returns it
  immediately with no fetch and no loading state on first render.
- [ ] 2.3 Seed as **initial data only**. It must never be re-applied on later renders — that would
  resurrect a stale session after logout, which is the one dangerous failure mode here (design Q2).

## 3. Simplify the guards

- [ ] 3.1 Remove the `isLoading` branch from the four layout guards (`(public)`, `(app)`,
  `(content)`, `(onboarding)`). There is no initial loading state left to gate on.
- [ ] 3.2 **Keep** the redirects — they handle state *changes* (sign-out in another tab, session
  expiry mid-session), which seeding does not address.
- [ ] 3.3 Confirm no guard still unmounts its subtree on an auth transition. That mount/unmount
  shape is what made #101 possible; removing it is the structural point of this change.

## 4. Verification — a real browser, every time

`curl` cannot see any of this. #101 was invisible to it because curl does not run JavaScript.

- [ ] 4.1 Signed in: full page load shows content immediately — **no spinner flash**.
- [ ] 4.2 Anonymous: `/login` still renders fast, and DevTools shows **no** `/auth/me` call.
- [ ] 4.3 Sign out in one tab, act in another — the second tab redirects rather than acting as a
  ghost session.
- [ ] 4.4 Expire a session server-side mid-session; confirm the next action redirects to login
  rather than silently failing.
- [ ] 4.5 Re-run the #101 guard: `e2e/auth-no-request-storm.spec.ts` must still pass.
- [ ] 4.6 Measure the added latency on a warm api and record the number. If it is materially worse
  than the ~40ms observed, say so rather than shipping it quietly — the whole decision rests on
  that figure.

## 5. Ship and document

- [ ] 5.1 Merge; verify on UAT with §4 against the deployed build.
- [ ] 5.2 Update `documentation/13_Frontend-Conventions.md` — auth is seeded, not fetched, on
  first render; `useAuth` is for changes.
- [ ] 5.3 Update `openspec/specs/auth` with the seeded-initial-state requirement.
- [ ] 5.4 Note in #92 that cold-start latency now affects signed-in page loads too — it makes the
  always-on replica trade-off more favourable than when it was declined.
- [ ] 5.5 CHANGELOG: user-visible (pages no longer flash a spinner before showing content).
- [ ] 5.6 Archive this change.
