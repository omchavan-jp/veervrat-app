## Why capabilities are not roles

Roles already exist — `VRATARTHI`, `VRATMITRA`, `MODERATOR`, `ADMIN` — and the temptation is to
add `BETA_TESTER` to the enum. That would be wrong in a way that only shows up later.

**Roles answer "who is this person in Veervrat?"** They describe domain identity and appear in
real product logic: who may see a journey, who moderates a comment. They are few, stable, and
meaningful to the practice.

**Capabilities answer "what may this person try right now?"** They are operational, temporary,
and have nothing to do with the practice. A person is a vratarthi **and** a beta tester **and**
a content editor simultaneously — roles are not additive in that way without becoming a bag.

Concretely: adding `BETA_TESTER` to `Role` leaks it into every switch that reasons about roles —
journey visibility, vratmitra relationships, moderation — none of which care. Each such switch
then needs a case that means "ignore this one".

## How it plugs into the existing permission model

`hasPermission` is pure and synchronous by design; membership that requires a database read is
passed **in** as a resource field. `isContentEditor` already works exactly this way:

```ts
| { type: 'platform'; isContentEditor?: boolean }
```

So this is a generalisation of a pattern already there, not a new one:

```ts
| { type: 'platform'; grants?: Capability[] }
```

`content.edit` and `feedback.*` then read `grants`. `hasPermission` stays pure, stays testable,
and no caller gains a database dependency it did not have.

## The composition rule, stated once

| | Question it answers | Where it lives |
|---|---|---|
| `FEEDBACK_MODE` / `CONTENT_EDIT_ENABLED` | does this feature exist **in this environment**? | env config |
| `UserCapability` | which **people** may use it here? | database |

Both must be satisfied. An environment with the feature off ignores grants entirely — which is
what makes "content editor never on prod" enforceable no matter what a future admin clicks.

`FEEDBACK_MODE` values:

- `off` — nobody, regardless of grants (prod today)
- `all` — every authenticated user, grants irrelevant (UAT, so Nachiket and reviewers need no setup)
- `granted` — only users holding `FEEDBACK_WIDGET` (prod, once testers exist)

`all` exists because UAT genuinely wants everyone, and expressing that as "grant every user"
would be busywork that drifts the moment someone new signs up.

## Enforcement lives on the server

The current gate is `feedbackMode === 'off' → render nothing`, in the browser, while the API
grants `feedback.*` to any authenticated user. That is a hidden control, not a denied one.

This change moves the decision to the API and leaves the widget's visibility as a *reflection*
of it — the UI hides what the server would refuse, rather than the UI being the rule.

The api container therefore needs `FEEDBACK_MODE` too; today only web has it. Easy to miss,
because the widget will look correctly gated long before the API is.

## `/auth/me` — one source, not two

Today: `roles: Role[]` **plus** `isContentEditor: boolean`, computed from a different mechanism
entirely. Two shapes for the same question.

After: `roles: Role[]` and `grants: Capability[]`. Two *concepts*, each with one source.

`isContentEditor` is removed rather than kept as an alias. Keeping it would leave the drift this
change exists to end, and the compiler is the cheapest way to find every reader — `session-user.ts`
and `lib/api/auth.ts` today.

⚠️ The server seeds the user into the query cache (#102), so the seeded object carries this shape
into server-rendered HTML. A stale field there survives longer than a stale fetch and is harder
to notice.

## Audit

Grant and revoke both write an `AuditEvent`, with `grantedBy` on the row itself so the current
state answers "who gave this to them?" without a log search. Actions:
`admin.capability.granted` / `admin.capability.revoked`, resource `user`.

This mirrors `admin.role.bootstrap_granted` from #114, and matches the reasoning there: handing
out access is exactly the operation whose record matters most.
