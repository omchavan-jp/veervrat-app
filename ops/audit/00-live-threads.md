# Audit 00 — Live threads: the error sweep, and why nobody could become a vratmitra

**Run 2026-08-27.** First of five passes (`ops/audit/00`–`04`). Each pass writes one file, makes
no claim without a `file:line`, and marks anything unproven as such.

**Scope of this pass.** Close the two threads that were open when the audit started: merge the
error-message sweep, and find out why accepting a vratmitra invitation failed on UAT.

The second one turned out to be the most serious defect found in this project to date.

---

## 1. The error sweep (#212) — merged

36 of 54 `onError` handlers discarded the server's message and showed a generic string. All 36
now pass it through `errorMessage(err, fallback)` (`apps/web/lib/api/error-message.ts`), which
surfaces 4xx messages and falls back on 5xx and network failures.

Why this went first: it makes every subsequent failure self-explaining. Without it, the
investigation below would have started from "Couldn't process this invitation" and no more.

---

## 2. The finding: the invite → accept flow was deadlocked for every real user

### What a person saw

On UAT, signed in as a normally-registered account, opening a vratmitra invitation and clicking
**Accept invitation** produced *"Couldn't process this invitation — It may have expired or already
been used."* The invitation had neither expired nor been used.

### What was actually happening

`apps/api/src/common/permissions/has-permission.ts:288` (before this change):

```ts
case 'vm_invitation.accept': {
  if (resource.type !== 'invitation') return false;
  return isVm(user) && resource.invitation.inviteeId === user.id;
}
```

`isVm(user)` is `hasRole(user, Role.VRATMITRA)` (`types.ts:217`).

**You had to already be a vratmitra to accept an invitation to become one.**

### Why nobody could satisfy it

Every write of `Role.VRATMITRA` in the entire repository, verified by exhaustive grep:

| Location | Grants | Reachable by |
|---|---|---|
| `auth.repository.ts:76,179` | `VRATARTHI` only | signup — every user |
| `admin-users.repository.ts:116` (`addRoles`) | any role | **admin screen only** |
| `database/grant-admin.ts:97` | `ADMIN` | CLI script |
| `e2e/helpers/global-setup.ts:46` → `db.ts:60` | `vratmitra` | **raw SQL INSERT** |

`addRoles` is called from exactly one place: `admin-users.service.ts:73`, behind the admin API.

So: signup grants `VRATARTHI`. Nothing in the invitation flow grants `VRATMITRA`. Accepting
requires it. **The only way to become a vratmitra was for an admin to grant the role by hand
before the invitation could be accepted** — a step no part of the product tells anyone to take,
and which the invitation email does not mention.

### Why no test caught it — the important part

Every test in the repository hands out the role in a fixture:

- unit specs: `roles: [Role.VRATMITRA]` in the user object (12+ files)
- integration specs: `roles: { create: [...] }` — **including `vm-roster.integration.spec.ts`,
  which I wrote earlier the same day**
- the Playwright e2e suite: `ensure(VM, ['vratmitra'])` → `INSERT INTO user_roles`

`e2e/flow-03-vm-invite-approve.spec.ts` is *named* for this flow and exercises invitation accept
end to end. It passes, because `global-setup` granted the role by SQL before the test began.

**This corrects a recommendation made earlier in the same session.** Wiring the e2e suite into CI
(audit pass 01) would **not** have caught this defect. The runtime pass is only as honest as its
fixtures, and this one seeds the exact state that makes the deadlock invisible.

This is the seventh — now eighth — instance of the failure mode recorded in `CLAUDE.md`: *a check
run with something that does not share the user's constraints confirms the mechanism and misses
the experience.* It is the purest instance so far, because here the fixture creates a state that
**no user can reach**.

---

## 3. The fix

Three changes, all in this pass's branch:

1. **`has-permission.ts` — `vm_invitation.accept`**: dropped `isVm(user)`. Being the named invitee
   is the authorisation; an invitation is a specific vratarthi asking a specific person.
2. **`has-permission.ts` — `vm_invitation.decline`**: same change, same reason. An invitee who
   could not decline could only ignore, leaving the invitation pending forever and blocking the
   vratarthi from inviting anyone else (one pending global invite per vratarthi,
   `invitations.service.ts:24`).
3. **`invitations.service.ts` + `invitations.repository.ts`**: accepting a VM invitation now
   grants `Role.VRATMITRA`, after the relationship is created and before the notification is sent.

### Why granting the role automatically is safe

Checked before changing it, not after. Every VM **data** permission in `has-permission.ts` pairs
`isVm(user)` with a relationship check — `isActiveJourneyVm(user, journey)` or
`isGlobalVmForJourney(user, journey)` — at lines 62, 63, 81, 94, 103, 109, 128, 136, 167, 169,
182, 183, 194, 195, 218, 219, 319, 325.

The only permissions satisfied by the role alone are `blog.create`, `comment.create`,
`comment.report`, `follow.create`, `follow.remove` — each written `isVa(user) || isVm(user)`
(lines 240, 255, 273, 278, 281). Every signed-up user is already `VRATARTHI`, so `isVa` is
already true and the added role grants **nothing**.

**Conclusion: the role alone opens no door. Access follows the relationship, not the role.**

### ⚠️ Needs your ratification — a policy question I answered provisionally

Granting the role on accept makes becoming a vratmitra **self-service**: anyone invited by any
vratarthi becomes one, for that relationship.

If Jnana Prabodhini intends vratmitras to be **appointed or trained** rather than self-selected,
the correct fix is the opposite: keep the admin gate and change the *product* — the invitation
flow should not offer an accept button to someone who cannot use it, and should say what to do
instead.

I chose self-service because the product ships an invite flow that sends email, renders an accept
page and creates a relationship, and its evident intent is that accepting works. **That is a
reading of intent, not a decision you made.** Overruling it is cheap: revert the two permission
cases and remove the grant.

---

## 4. Proof

`apps/api/src/test/vm-invitation-accept.integration.spec.ts` — 4 tests against real Postgres.
**Nothing in this file may grant a role directly**; users are created exactly as signup creates
them (`VRATARTHI` only), which is what every other test failed to do.

| Test | Before the fix | After |
|---|---|---|
| a normally signed-up person can accept, and becomes a vratmitra | **403 ACCESS_DENIED** | 200, relationship formed, roles `[VRATARTHI, VRATMITRA]` |
| a non-invitee cannot accept even knowing the token | 403 | 403 |
| accepting twice is refused, and says which | (unreachable) | 409 `INVITATION_NOT_PENDING` |
| an expired invitation is refused | (unreachable) | 422 `INVITATION_EXPIRED` |

The 403 in column two is the exact failure seen on UAT, reproduced locally.

**Load-bearing check:** reverting only the `vm_invitation.accept` permission — leaving the role
grant in place — fails 3 of the 4 tests. The test cannot pass without the fix.

Full gate with `--force`: 8/8 tasks, 0 errors, 1011 api + 202 web tests executed.

---

## 5. What this pass did NOT establish

- **Whether the UAT invitation you clicked is now acceptable.** The fix ships on merge; the
  invitation in question may also have been left `ACCEPTED` by a partial earlier attempt (see
  below). Retrying on UAT after deploy is the only way to know.
- **Whether any existing UAT/prod user is in a broken intermediate state.** Not inspected — no
  database access from this session.
- **The accepted-first ordering risk is real but unproven.** `acceptInvitation` marks the
  invitation `ACCEPTED` *before* creating the relationship, and the code comment says it "can be
  retried by resetting to PENDING" — **nothing performs that reset.** If relationship creation
  ever fails, the invitation is consumed and unrecoverable through the product. I did not
  reproduce this; it is a code reading. Filed rather than fixed, because fixing it properly means
  a transaction boundary and that is a change worth doing deliberately.

---

## 6. Follow-ups filed

- **#213** — no received-invitations surface; the in-app notification deep-links to the sender's
  page. Independent of this defect and still open: even with accept working, an invitee who
  misses the email has nowhere to go.
- Ordering/transaction risk above — see `ops/audit/03-surface-audit.md` for where it lands.
