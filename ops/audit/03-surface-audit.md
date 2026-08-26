# Audit 03 — Does every capability have a surface, and does it carry the API's answer?

**Run 2026-08-27.** Fourth of five passes.

**The question.** Every defect this audit has found has the same shape: **the backend is right and
the last mile is missing.** The API returns a precise 409 and the toast says "something went
wrong". The API can list your vratarthis and no page shows them. The API can accept an invitation
and no permission lets you.

So this pass asks two mechanical questions of the whole surface:

1. Does every API route have somewhere in the product that calls it?
2. Does every notification the backend can emit lead somewhere that can show the thing?

Regenerable check: `scripts/audit-surface-map.py`.

---

## 1. API routes without a surface

**206 routes examined. 7 have no reference anywhere in `apps/web`.** Four are correctly invisible:
`/health`, `/ready`, `/auth/google/callback` (a redirect target), `/users/check-username` (reached
through a different literal).

Two matter.

### 1.1 🔴 `GET /users/me/data-export` — filed as #217

`ops/data-map.md` §5a calls this **"the mechanism the privacy policy has promised since it went
live"**, and documents at length what it includes — down to careful reasoning about whether mentor
sidenotes belong in it.

**Nothing in the web app references it.** No button, no settings row, no link. Searched for
`data-export`, `dataExport`, `data_export`: zero hits.

#135 — titled *"User data export — **the access and portability obligation has no mechanism**"* —
was **closed 2026-08-24**.

The obligation still has no mechanism from the only perspective that counts. A person who wants
their data has no way to ask, exactly as before; the difference is that the register now says
otherwise. `ops/legal-briefing-pack.md` is going to a lawyer on the strength of this.

### 1.2 `POST /admin/weakness-subvirtues` — no admin UI

Lower stakes: an admin endpoint with no screen. Not filed separately; recorded here so it is not
rediscovered as a surprise.

---

## 2. Notifications: two maps, maintained by hand, and neither is checked

There are **two independent maps** deciding where a notification takes you:

| Channel | File |
|---|---|
| Email | `apps/api/src/modules/notifications/notification-link.ts` |
| In-app bell | `apps/web/components/layout/notification-panel.tsx` → `eventTypeToPath` |

Nothing keeps them in step. Across **22 event types**:

| | Count |
|---|---|
| Bell is **inert** — renders, click does nothing | **10** |
| The two maps **disagree** on the destination | **7** |
| Both agree — on the **sender's** page (#213) | **5** |

**Every single event type is one of the three.** Not one notification is both consistent and
correct.

### 2.1 The 10 inert ones — filed as #218

`eventTypeToPath` falls through to `default: return null`, so ten notification types render and do
nothing when clicked. All ten have a working email link:

`CUSTOM_ERC_REVIEW_REQUESTED` (email goes to `/moderation/custom-erc`), `CUSTOM_ERC_APPROVED`,
`CUSTOM_ERC_REJECTED`, `VM_SUGGESTION_NEW`, `VM_SUGGESTION_DISMISSED`, `BLOG_COMMENT_NEW`,
`COMMENT_REPORTED`, `NEW_FOLLOWER`, `CHAT_MESSAGE_RECEIVED`, `VM_WITHDREW`.

Several have an obvious destination that already exists — `NEW_FOLLOWER` → `/u/[username]`,
`BLOG_COMMENT_NEW` → `/community/blogs/[id]`, `COMMENT_REPORTED` → `/moderation`. There is **no
comment marking any as deliberately non-clickable**; the `default` arm is a silent fallthrough,
not a decision.

### 2.2 The 7 disagreements — an inconsistency to decide, not asserted as a bug

For the ERC and journey family, email sends you to `/actions` and the bell to `/journeys` or
`/journeys/:id`.

`notification-link.ts` says it is *"deliberately coarse"* because the recipient's role changes
where the item lives, and the bell can afford precision. **That is a defensible design.** It is
filed as an inconsistency because the same notification behaving differently by channel is either
a choice someone made or drift nobody noticed — and right now nobody can tell which.

### 2.3 The 5 that agree, agree on the wrong page

The invitation family maps to `/invitations` in both — the **sender's** page. That is #213.

### 2.4 This has drifted before

The frontend map carries its own comment:

> *this map had drifted to `/dashboard`, which isn't where a pending invitation is visible.*

Someone found the drift, corrected it, and moved it to another wrong destination. **Two maps
maintained by hand will drift again.** The fix is a shared table or a test that fails when an
event exists in one map and not the other — not a third careful correction.

---

## 3. What this pass changed

Nothing in the product. Two issues filed (#217, #218), one script kept
(`scripts/audit-surface-map.py`) so the check is regenerable rather than a one-off narrative.

Deliberately no fixes: every finding here needs a **destination decision** — where should a
follower notification go, should the two maps agree, how should an export be delivered — and those
are product decisions, not implementation ones.

---

## 4. What this pass did NOT establish

- **Whether the surfaces that exist are any good.** This checks that *something* calls each route
  and that a link resolves to a route that exists. It says nothing about whether the page is
  usable, correct, or reachable in practice by the person who needs it.
- **Reachability by role.** A route can exist and be invisible to the person the notification was
  sent to — which is exactly #213's shape, and this check would not have found it. It was found by
  a human clicking.
- **The 4 routes I classified as "correctly invisible"** were judged by reading, not by testing.
- **Anything about web pages with no API behind them** — the inverse question. Not asked.

---

## 5. The pattern, stated plainly

Across passes 00–03 the same defect recurs in five places: the invitation deadlock, the received-
invitations gap (#213), the discarded error messages (#212), the missing roster (#193), and now
data export (#217) and inert notifications (#218).

In every case **the backend was built, tested, and correct**, and the thing a person touches was
missing, inert, or pointed somewhere useless.

That suggests the working definition of "done" in this project has been *the API can do it*. The
cheapest correction is not more tests of the kind that already pass — it is that **a feature is
not done until someone can reach it**, which is what the e2e suite from pass 01 now enforces for
ten journeys.
