> Closes #22 (open since 2026-07-18, reported by a real user) and #222. One change, because both
> need the inviter's identity and building that projection twice would be waste.

## 0. Read first

- [x] 0.1 `design.md` decision 1 — separate routes, and the ordering hazard they create.
- [x] 0.2 `design.md` decision 2 — `GET /invitations/:token` is public, so what it does NOT
  return matters as much as what it does.

## 1. The API can answer "what was I invited to"

- [x] 1.1 `listByInvitee(userId)` in the repository — PENDING only, with the inviter selected.
- [x] 1.2 `GET /invitations/received`. `GET /invitations` keeps meaning "sent" — no existing
  caller changes.
- [x] 1.3 ⚠️ **Declare it BEFORE `/invitations/:token`.** Nest matches in declaration order, so
  the parameter route would otherwise swallow it and 404 on a correct-looking URL.
- [x] 1.4 Test that `/invitations/received` is reachable and is not matched as a token. This is
  the guard for 1.3 — a comment is not, because a refactor reorders routes innocently.

## 2. An invitation can say who sent it

- [x] 2.1 `GET /invitations/:token`, **no session required** — the reader may have no account.
  Implemented as a **separate controller** (`PublicInvitationsController`), because
  `InvitationsController` carries a class-level `SessionGuard` and there is no `@Public()`
  decorator in this codebase. Same shape as `UploadsResolverController`, which is separate from
  `UploadsController` for exactly this reason. **This moves the ordering hazard from method order
  to the module's `controllers` array** — the test in 1.4 covers it either way, and was proven by
  swapping the array and watching it 404.
- [x] 2.2 Returns only what the invitation email already told them: inviter display name, username
  and avatar; type; journey title if journey-scoped; sent-at; expires-at; status.
- [x] 2.3 Not-found, expired and malformed are **the same response**. A distinguishable reply
  confirms the token was real and turns this into an oracle for guessing them.
- [x] 2.4 Rate-limited — cheap to call, and it identifies a person.
- [x] 2.5 Tests: a valid token returns the inviter; a wrong token and an expired one are
  indistinguishable; **nothing about the invitee is returned**.

## 3. Seeing them

- [x] 3.1 Received section on `/invitations`, above the sent list.
- [x] 3.2 Page title stops assuming you came to send.
- [x] 3.3 Accept and decline inline, calling the same endpoints the token page calls — one accept
  path, not two.
- [x] 3.4 Empty state that reads as ordinary, not as a fault.
- [x] 3.5 Errors surfaced from the API (`errorMessage`, #212), not a generic string.

## 4. The accept page tells you who is asking

- [x] 4.1 Fetch the invitation before rendering. It currently fetches nothing, which is why it
  looks identical for valid, expired and already-used tokens.
- [x] 4.2 Show the inviter, with their name linked to `/u/[username]`.
- [x] 4.3 An invitation that cannot be accepted says so **before** offering buttons.

## 5. Verify like a person

- [ ] 5.1 On a deployed environment, with two accounts: invite, then as the invitee **follow the
  in-app notification** — not the email — and accept from where it lands.
- [ ] 5.2 As the invitee, confirm the invitation names the inviter before you accept.
- [ ] 5.3 Open an expired or already-used invitation and confirm you are told before pressing
  anything.
- [ ] 5.4 As someone with no account, open an invitation link and confirm it still names the
  inviter.

⚠️ 5.1 is the one this change exists for, and it is the one no test can stand in for: the whole
defect is that a person following a notification arrives somewhere useless.
