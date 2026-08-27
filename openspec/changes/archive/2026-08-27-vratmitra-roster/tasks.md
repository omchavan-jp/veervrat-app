## 1. The missing foreign key

- [x] 1.1 Check for orphan rows FIRST — `vratarthi_id` values with no matching user. The
  migration must **fail loudly** on any, rather than the FK creation producing a bare Postgres
  error nobody can act on. — `20260826140000_vm_relationship_vratarthi_fk`; proven by running it
  against a deliberately unconvertible row and seeing it refuse before changing anything.
- [x] 1.2 Add the `vratarthi` relation to the Prisma model and the FK to the table. `ON DELETE
  RESTRICT`, matching the `vm_id` side — deleting a user who is mid-relationship should be
  refused, not silently cascade a relationship away.

## 2. The endpoint

- [x] 2.1 `listVratarthisForVm(vmId)` — active, non-ended relationships, including the
  vratarthi's id, display name, username and avatar. Mirrors `getMyVms`'s shape.

  **Deviation from this task as written.** It said *global* relationships. Built as both scopes,
  because the nav gate this change reuses — `hasAnyVmAssignment` — counts journey assignments
  too. Global-only here would have sent a journey-scoped vratmitra to a page telling them they
  mentor nobody, while they mentor someone. The mirror is now exact: `getMyVms` returns both
  scopes with `scope` and `assignedJourneys`, and so does this.
- [x] 2.2 Basic stats: when they joined, and how many journeys they have. **Not** their
  weaknesses or journey content — that belongs to the relationship, not to the roster. Asserted
  as an exact key set in both the unit and integration specs, so a later `include` that widens
  the disclosure fails a test.
- [x] 2.3 `GET /vm-relationships/my-vratarthis`, guarded by a session.
- [x] 2.4 Tests: a vratmitra sees their vratarthis; someone with none sees an empty list; a
  vratarthi does not see themselves; an ended relationship is excluded. — `vm-roster.service.spec.ts`
  (unit) and `vm-roster.integration.spec.ts` (7 tests against real Prisma, because which scopes and
  states the query counts is a question a mocked repository answers "yes" to regardless).

## 3. The page

- [x] 3.1 `/vratmitra/my-vratarthis/page.tsx`, replacing the `.gitkeep`.
- [x] 3.2 Loading, empty and error states via the existing primitives. The empty state should say
  something useful — a vratmitra with nobody yet is the normal starting condition, not a fault.
- [x] 3.3 Each entry links to the person's profile.

## 4. Navigation

- [x] 4.1 Show the item only to someone who mentors, using `hasAnyVmAssignment` — the gate that
  already exists for exactly this. Reached through `actions.hasAssignments`, which the shell
  already read; the item sits behind the same condition as VM Guidance.
- [x] 4.2 Confirm what a person who is BOTH sees: their own items and the vratmitra ones, in one
  navigation. That is the whole point of the role decision, and it is the case most likely to
  look wrong. — **Confirmed on UAT 2026-08-27 via 5.3**, by observation rather than by reading
  the code.

## 5. Verify like a person

- [x] 5.1 On a deployed environment, as a vratmitra with at least one vratarthi: the item appears
  and the roster lists them.
  **Verified on UAT 2026-08-27** by a real invite → accept → roster round trip, reported by Om.
  The badge read **Overall**, which is the answer that mattered: the relationship formed as a
  global one, so `listVratarthisForVm`'s global branch is exercised end to end against a real
  database. This could not be run until the same day — accepting a vratmitra invitation returned
  403 to every user (#214) and an invitation to a non-member never linked to their account (#215).
- [x] 5.2 As someone who mentors nobody: the item does not appear at all. **Confirmed on UAT
  2026-08-27** — absent from the navigation, not merely empty.
- [x] 5.3 As someone who is both: both sets of navigation are present and neither is duplicated.
  **Confirmed on UAT 2026-08-27.** This was the case no test of mine could reach and the one the
  role-not-mode decision rides on: a person who is both a vratarthi and a vratmitra sees their own
  navigation *and* the vratmitra items, in one sidebar, with nothing repeated.

⚠️ 5.1–5.3 need two accounts with a real relationship between them. A test that only ever runs as
one account cannot see the case this change exists for.

**Section 5 complete, 2026-08-27.** A real vratmitra, invited and accepted through the product on
UAT, sees a real roster. It could not be attempted until that day: accepting an invitation
returned 403 to every user (#214), and an invitation to someone not yet registered never linked to
their account (#215). Both were found by this change's own verification step refusing to pass.
