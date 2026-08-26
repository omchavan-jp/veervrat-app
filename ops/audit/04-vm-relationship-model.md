# Audit 04 — The vratmitra relationship is modelled twice, and ending one does not end it

**Run 2026-08-27.** Last of five passes.

**Why this pass.** A vratmitra relationship lives in **two tables**:

| Table | Meaning |
|---|---|
| `vm_relationships` | **global** — mentors this person across everything |
| `journey_vm_assignments` | **journey-scoped** — mentors this person on one journey |

Neither is a subset of the other, so every query answering *"who mentors whom"* must consult both.
One that consults only one under-reports **silently** — it returns a plausible shorter list, not
an error.

This pass found something worse than under-reporting.

Regenerable check: `scripts/audit-vm-model.py` — enumerates all 22 queries against either table.

---

## 1. 🔴 Ending a vratmitra relationship did not end their access

### The trap

`VmRelationshipState` has exactly two values:

```prisma
enum VmRelationshipState { PENDING  ACTIVE }
```

**There is no `ENDED`.** A relationship ends by having `endedAt` set **while its state stays
`ACTIVE`** — that is what `endGlobalVm` and `endJourneyAssignment` both do:

```ts
data: { endedAt: new Date() }   // state untouched
```

So `where: { state: ACTIVE }` without `endedAt: null` returns ended relationships as live ones.
And the two permission helpers decide on **state alone**:

```ts
// types.ts:249
rel.state === VmRelationshipState.ACTIVE
// types.ts:238
journey.vmAssignments.some((a) => a.state === VmRelationshipState.ACTIVE)
```

### The chain

`journeys.repository.ts` fed both helpers with unfiltered data:

- `journeySelect.vmAssignments` — `where: { state: ACTIVE }`, **no `endedAt`**
- `findById`'s global lookup — `where: { vratarthiId, state: ACTIVE }`, **no `endedAt`**, and it
  did not even *select* `endedAt`, so the helper could not have checked it.

`has-permission.ts:62–63` then grants `journey.view` to both.

**Result: a vratmitra who had been removed could still read their former vratarthi's journeys.**
Proven, not inferred — `vm-access-revocation.integration.spec.ts` had an ex-vratmitra fetch the
journey and receive **200** with the full body: title, state, ERC counts, weaknesses.

The whole point of removing a vratmitra is that they stop reading your material. They did not.

### The same file knew better

`journeys.repository.ts:365` — a different query in the **same file**:

```ts
vmAssignments: { where: { state: ACTIVE, endedAt: null }, ... }
```

The correct filter was known and applied inconsistently. That is the signature of a model that
makes the wrong thing easy: nothing about `where: { state: ACTIVE }` looks incomplete.

### Fixed

Both filters now carry `endedAt: null`, with the reason written at each site. The four revocation
tests pass; before the fix, two of them returned 200.

---

## 2. Profile statistic counted invitations nobody accepted

`users.repository.ts` — "completed journeys this user was the assigned VM for", shown on a public
profile as credibility:

```ts
count({ where: { vmId: user.id, journey: { state: 'COMPLETED' } } })
```

No filter on the **assignment's** state, so a `PENDING` assignment — an invitation the person
never accepted — counted. Now requires `state: ACTIVE`.

`endedAt` is deliberately **not** filtered here: an assignment that ended after the journey
completed should still count, because they did guide it. Filtering it would erase credit for
every relationship that has since wound down, which is most of them over time. Written at the
call site so the asymmetry with §1 is not read as an oversight.

---

## 3. The dual-model survey

**22 queries, 17 reads.** Grouped by enclosing method:

**Consult both scopes — complete by construction (5):** `getMyVms`, `getVratarthiVmContext`,
`hasActiveRelationshipBetween`, `hasAnyVmAssignment`, `listVratarthisForVm`.

**Single-scope (12):** ten are scope-specific by name and correctly so — `findActiveGlobalVm`,
`createJourneyAssignment`, `endGlobalVm`, `getVmAssignedJourneys` and similar. Two were worth
looking at, and both are covered above.

One more, recorded and **not** changed:

- **`stats.repository.getPlatformStats()` counts only global relationships.** If that statistic
  means "mentoring relationships on the platform", it under-reports by every journey-scoped one.
  Not fixed because what the number is *for* is a product question — I do not know whether it is
  meant to count relationships or people.

**`listVratarthisForVm` is in the complete list only because this audit's own pass on #193 caught
it.** It was written global-only, hours earlier, by me — and would have told a journey-scoped
vratmitra they mentor nobody. It was found by reading the nav gate, not by a test.

---

## 4. What should change in the model

The queries are fixed. The **shape that produced them is not**, and it will produce them again.

`state: ACTIVE` reads as complete and is not. Every correct query has to remember a second
condition that nothing enforces, and there are two tables to remember it on.

Three options, in increasing order of cost — **a decision for you, not made here**:

1. **Add `ENDED` to the enum** and set it when ending. `state` then means what it looks like it
   means. Migration is mechanical (`state = ENDED where ended_at is not null`), but every existing
   `state: ACTIVE` query changes meaning at once, so it must land in one change.
2. **Keep the columns, remove the choice.** A single `activeVmWhere` fragment used by every query,
   and a lint rule or test that fails when either table is queried without it. Cheaper, and it
   leaves the trap in place for anyone who does not use the helper.
3. **Collapse the two tables** into one with a nullable `journeyId`. Removes the union problem at
   the root and is much the largest change. Probably not worth it now.

**Option 1 is the one that stops the class of bug**; option 2 stops the instances. I would do 1,
and only after beta.

---

## 5. What this pass did NOT establish

- **Whether an ex-vratmitra could read anything else.** I fixed `journey.view`'s inputs and tested
  that path. Chat rooms, experience logs, test results and the guidance queue all have their own
  reads, and `hasActiveRelationshipBetween` — which authorises chat — *does* filter `endedAt`. I
  did not test them end to end. **The four revocation tests cover journeys only.**
- **Whether any real relationship has been ended in UAT or prod**, and therefore whether this was
  ever exploited. No database access from this session. Given the beta has not opened and the
  invite flow was itself deadlocked until today, the exposure is likely nil — but that is
  reasoning, not evidence.
- **Whether the permission helpers should check `endedAt` themselves.** They currently trust their
  input. Making them check would be defence in depth, and would have prevented this. Not done:
  it changes `JourneySlim`, and the fix at the query is sufficient and provable today.
