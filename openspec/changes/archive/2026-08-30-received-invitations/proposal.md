## Why

**An invited person cannot see, judge, or act on their invitation inside the product.**

Reported by a real user on **2026-07-18** (#22), correctly diagnosed then as *"blocks the VM↔VA
connection flow, which is core to the app"*, and still open five weeks later:

> The invited vratmitra never sees the pending request on their side, so they can't accept. The
> notification does show but its link routes to the wrong page.

Two of the three causes have since been fixed — accepting was impossible for everyone (#214), and
an invitation to a non-member never linked to their account (#215). **The third is untouched, and
it is the one the issue is actually about.**

### The API cannot answer the question

`InvitationsController` exposes exactly one list endpoint:

```
GET /invitations  →  listByInviter(user.id)     // what you SENT
```

**There is no `listByInvitee`.** The API cannot answer *"what was I invited to"*, so no interface
could show it. The invited person's only route is the emailed link — miss the email, or click the
in-app notification instead, and the invitation is unreachable.

The notification points at `/invitations`, which is the **sender's** page, titled *"Invite a
Vratmitra"* and listing invitations you sent. `notification-panel.tsx` records that this map was
already corrected once, from `/dashboard` — it was moved from one wrong destination to another,
and #227 deliberately left it wrong because **there is nowhere right to point until this change
exists.**

### And the invitation says nothing about who sent it

Found on UAT on 2026-08-27 (#222), in the first invite→accept round trip that has ever completed:

> *"I couldn't know who had sent the invitation, no link or display of stats/profile, name or
> anything."*

`/invitations/[token]/accept` **fetches nothing**. It renders static copy and two buttons. That is
also why it looks identical for a valid token, an expired one, and one already used — it cannot
know.

Accepting makes someone your vratmitra: they gain read access to your journeys, weaknesses,
experience logs and check-ins. **That is a consent decision, and it is currently made blind.**

## What changes

Both issues share one thing — the inviter's identity — so they are one change. Building the
projection twice would be waste, and shipping the list without the identity would leave the
consent problem in place.

- **`GET /invitations/received`** — invitations addressed to you, each carrying who sent it, what
  kind it is, and when it expires.
- **`GET /invitations/:token`** — one invitation by token, readable **without a session**, so the
  accept page can say who is asking before anyone agrees to anything.
- **A received section on `/invitations`**, with accept and decline inline, and a page title that
  no longer assumes you came to send.
- **The accept page shows the inviter**, and reflects an expired or already-used invitation
  *before* offering buttons rather than discovering it on click.
- **Both deep-link maps repointed** — which is now one map (#227), so this is a single change.

## Decisions taken with Om, 2026-08-27

1. **Separate routes, not `?direction=`.** Reasoning in `design.md` decision 1.
2. **No new navigation entry.** Reached from the notification and from `/invitations`, consistent
   with how invitations are already reached.

## What this is NOT

- Not a redesign of the invitation flow. Sending, accepting and declining all work; this is the
  missing half of *seeing*.
- **No bulk actions.** Accepting several invitations at once is not a thing anyone needs.
- **No invitation history for the invitee** beyond what is pending — a declined invitation is
  finished, and keeping a list of them invites nothing but second-guessing.

## Risks worth stating before building

- **`GET /invitations/:token` is public by token.** It must return only what the invitation email
  already told the recipient, and nothing else about the inviter. Not-found, expired and wrong
  token must be indistinguishable, or the endpoint becomes a way to test whether a token is real.
- **Route ordering is a silent failure.** `/invitations/received` must be declared before
  `/invitations/:token` or Nest will match the parameter route and treat "received" as a token.
  This fails as a 404 on a real-looking URL, so it needs a test, not care.
