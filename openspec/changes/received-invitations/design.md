# Design

## Decision 1 — Separate routes, not a direction parameter

### Options

**A. `GET /invitations?direction=received`.** One route, one client method.
*Rejected.* Three reasons, in order of weight:

1. **The two lists are different things.** Received needs the **inviter's** identity and the
   expiry. Sent needs the **invitee's email** and the reminder state. One endpoint forces a shape
   carrying fields meaningless to half its callers, and the shapes will diverge further.
2. **The actions differ** — accept/decline versus cancel/remind. Two permission decisions behind
   one route is where mistakes live.
3. **`GET /invitations` already means "sent".** A parameter makes its *default* ambiguous forever,
   and every future reader has to check which way round it is.

**B. `GET /invitations/received`, leaving `GET /invitations` as "sent".** ✅ **Chosen.** Explicit,
breaks no existing caller, and each response returns exactly what its consumer needs.

**C. One merged response containing both.** *Rejected.* The UI needs them apart anyway — different
sections, different actions per row — so merging only moves the split into the client.

### ⚠️ The ordering hazard this creates

`/invitations/received` and `/invitations/:token` are both `GET /invitations/<something>`. Nest
matches **in declaration order**, so if the parameter route is declared first, "received" is read
as a token and the endpoint 404s on a URL that looks entirely correct.

**Mitigation: a test that calls `/invitations/received` and asserts it is not a 404**, not a
comment asking the next person to be careful. Declaration order is exactly the kind of thing a
refactor reorders innocently.

## Decision 2 — `GET /invitations/:token` is public, and deliberately thin

The accept page must be able to say who is asking **before** anyone agrees, and the person reading
it may not have an account yet — so this cannot require a session.

That makes it enumerable by anyone with a token-shaped string, so:

- **It returns only what the invitation email already told the recipient**: the inviter's display
  name, username and avatar, the invitation type, the journey title if journey-scoped, when it was
  sent, when it expires. **Nothing else about the inviter**, and nothing about the invitee.
- **Not-found, expired and malformed are the same response.** A distinguishable "expired" reply
  confirms the token was real, which turns the endpoint into an oracle for guessing them. The
  *page* can still say "this invitation has expired" — it learns that from the status of an
  invitation it was allowed to read, not from a 404 that means something different.
- **It is rate-limited.** Cheap to call and it identifies a person.

## Decision 3 — What the received list carries

Per invitation: inviter (display name, username, avatar), type (**global vs journey — materially
different commitments**), journey title where journey-scoped, sent-at, expires-at, status.

**Only PENDING invitations.** A declined one is finished; an accepted one has become a
relationship and belongs on `/my-vratmitras`. Keeping a history here would give the invitee a list
of decisions to re-litigate and no action to take on any of them.

## Decision 4 — One page, two sections

`/invitations` gains a **received** section above the existing sent list, and a title that no
longer assumes you came to send.

Not a separate page: someone who has both sent and received one should see both without knowing
which page holds which, and the notification has one place to point. That also means the deep-link
map needs no per-direction logic — since #227 there is only one map, and it keeps pointing at
`/invitations`, which finally becomes the right answer.

## Decision 5 — Accept and decline inline

Inline in the row, not a navigation to the token page. The token page remains for the emailed
link, where it is the only entry point.

Both surfaces call the same endpoints, so there is one accept path, not two.

## What is deliberately not decided here

- **Whether an invitation can be re-sent after declining.** Currently a vratarthi may hold one
  pending global invite, and declining frees it. Whether the same person can immediately be
  re-invited, and whether they should be told, is a product question this change does not need to
  answer.
- **Notification when an invitation is about to expire.** `VM_INVITATION_EXPIRED` exists and fires
  after the fact. A warning before would be kinder and is out of scope.
- **Where an accepted journey-scoped invitation lands.** `/my-vratmitras` shows global and journey
  vratmitras already; whether the invitee's first view should be the journey instead is a UX
  question, not a blocker.
