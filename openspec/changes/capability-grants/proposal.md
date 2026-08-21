## Why

**"Which users can do X" is being answered by environment configuration, which cannot answer it.**

Two features need per-user access on prod — the beta feedback widget and the in-context content
editor. Today both are gated by env vars, and env vars have the wrong shape for this:

- a user can only be allowlisted **after** they sign up, so each beta tester costs
  signup → find UUID → edit Terraform → PR → CD deploy → access. A full deploy cycle per person.
- `CONTENT_EDITOR_USER_IDS` already demonstrates the pain, and is set in **no environment** —
  the mechanism was never usable enough to use.

Env config describes **the environment**, identically for every visitor. Who may do something is
**data about a person**. Conflating them is the same category error as §17's build-time trap,
one layer up.

### The gating is currently cosmetic, which is worse than it looks

`FEEDBACK_MODE` is set on the **web** container only (`container-apps.tf`), and permission logic
grants feedback to any authenticated user:

```ts
case 'feedback.create':
case 'feedback.read':
case 'feedback.upvote':
  return resource.type === 'platform';
```

So on prod the widget is **hidden, not denied**. Anyone signed in who calls the API directly can
create feedback. Hiding a control is not access control — and shipping "granted users only" on
top of a check that grants everyone would leave a rule that reads as enforced and is not.

This change closes that, and it is the part most likely to be lost if the work is rushed.

## What changes

**A `UserCapability` table**, mirroring `UserRole`: composite key, cascade delete, plus
`grantedAt` and `grantedBy` because handing out access should say who did it and when.

**Capabilities are feature-scoped**, not person-scoped: `FEEDBACK_WIDGET`, `CONTENT_EDIT` — one
per gated feature. A person-scoped `BETA_TESTER` would silently change meaning every time a
feature was added to it; the audit log would record a grant whose consequences drift after the
fact.

**Env vars keep only the environment-level question.** `FEEDBACK_MODE` becomes
`off | all | granted` (UAT `all`, prod `granted`). `CONTENT_EDIT_ENABLED` stays, and stays
`false` on prod permanently per O7. Env answers *whether the feature exists here*; grants answer
*who*.

**`/auth/me` returns one coherent `grants` array**, replacing the `isContentEditor` boolean. Not
additive — the point is that there stops being two sources.

**`CONTENT_EDITOR_USER_IDS` is deleted.** Verified set in no environment, so there is no
allowlist to migrate; this is a deletion, not a data migration.

**Granting happens in `/admin/users/[id]`**, ADMIN only, audited on both grant and revoke.

## Scope

**In:** the capability model, API, admin toggle UI, `/auth/me` shape change, real server-side
enforcement of `feedback.*`, deletion of `CONTENT_EDITOR_USER_IDS`, docs.

**Out, deliberately named** so absorbing them later is a decision rather than a drift:
- **#24** Home/Navbar/Study IA redesign
- **#25** shloka tags / queue reorder
- **#29** Platform Stats dashboard
- **#116** navigation/breadcrumb/redirect revisit
- an admin/superadmin split — admin is already effectively superadmin (`PATCH
  /admin/users/:id/roles` lets any admin add or remove ADMIN on anyone, guarded only against
  self-lockout). A second tier is complexity without a second audience.
- time-bound or expiring grants — no case for them yet; the table can carry an expiry later
  without reshaping anything.

## Risks

**The `/auth/me` shape change is breaking.** `isContentEditor` is read by `session-user.ts` and
`lib/api/auth.ts`; the server also seeds the user into the query cache (#102). API and web must
change together, and the seeded-user path must be updated or a stale boolean will linger in
server-rendered HTML.

**Enforcing `feedback.*` for real will deny requests that currently succeed.** That is the fix,
but on prod it changes behaviour for anyone who has been using the widget. Prod's
`feedback_mode` is `off` today and there are no testers, so the window to do this safely is now.

**A capability check that is only in the UI is worthless.** Every capability needs a server-side
test, not merely a hidden control. The auth matrix below is the guard.

## Open question for review

Should `CONTENT_EDIT` be grantable on prod at all, or refused at the API layer regardless of
environment config? O7 says "content editor never on prod, for anyone". A grant that can be
issued but never takes effect is a footgun — an admin could toggle it, see it saved, and assume
it worked. Leaning: the API refuses `content.edit` on prod outright, and the admin UI shows the
toggle as unavailable there rather than merely inert.
