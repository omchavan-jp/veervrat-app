## Why

**A vratmitra has no way to see the people they mentor.**

`(vratmitra)/` holds one real page — `guidance` — and three `.gitkeep` placeholders, one of which
is `my-vratarthis`. There is no endpoint behind it either: `vm-relationships.repository.ts` can
answer "who are my vratmitras?" (`getMyVms`) but nothing answers the mirror.

The vratmitra↔vratarthi relationship is the product (`spec/CONTEXT.md`). The app has a complete
vratarthi experience and a fragment of a vratmitra one.

This also unblocks #22: a request to become someone's vratmitra has nowhere to live until the
roster exists, and putting an inbox on `/invitations` would place a vratmitra's only view of
their vratarthis inside the vratarthi half of the app.

## Decisions taken (Om, 2026-08-26)

**Vratmitra is a ROLE, not a mode.** Its surfaces sit alongside the vratarthi ones, and the
navigation shows them only to someone who actually mentors. No switcher, no separate shell —
most people here are both, since a vratmitra is also walking their own vrat, and a switcher would
tax exactly those people on every visit.

The code already leans this way: `hasAnyVmAssignment` exists and is commented "for nav gating".

**The roster shows name, basic stats, and a link to the profile.** Enough to recognise someone
and to decide; not their journey content, which belongs to the relationship rather than to the
decision to enter one.

## What Changes

**1. `GET /vm-relationships/my-vratarthis`** — the mirror of `getMyVms`. Active global
relationships where the caller is the vratmitra.

**2. `/vratmitra/my-vratarthis`** — the roster page, replacing a `.gitkeep`.

**3. Navigation** shows it only to someone who mentors, using the gate that already exists.

**4. A foreign key on `vm_relationships.vratarthi_id`.** Found while building this: the table has
one on `vm_id` and none on `vratarthi_id`, because the Prisma model declares a relation for the
vratmitra side only. So a relationship can point at a user who does not exist. Adding the
relation is also what makes the vratarthi's details fetchable in one query rather than two.

## What This Does Not Change

- **Pending requests are #22**, not this. The roster is where they will live; accepting one is
  its own change with its own decisions already recorded.
- **The other two vratmitra pages** — `dashboard`, `journeys/[id]` — stay `.gitkeep`. Build each
  when there is something it is the only home for, not because a placeholder reserved the name.
- **Journey-scoped assignments.** `getMyVms` handles both global and journey scopes; this returns
  global relationships only, matching what the roster is for. Journey assignments already have a
  home in the guidance queue.
