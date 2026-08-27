# Design

## Decision 1 — How a suggestion knows where it was made

This is the only hard problem in the change. "Every page and every entity" rules out instrumenting
pages by hand, so the anchor has to be derived from the DOM at the moment of the click.

### Options considered

**A. Route + free text.** Record the URL, let the author describe the place in words.
*Rejected:* this is the feedback widget, and it is what already fails. "Add a description to the
study page" cannot be acted on without the author present.

**B. Declarative section registry.** Wrap every section: `<Suggestable id="weakness.description">`.
*Rejected as the starting point:* the most durable option and the most expensive. It requires
touching every page before a single suggestion can be made anywhere, which inverts the stated
priority — coverage first. Kept as an **upgrade path**, not a prerequisite.

**C. Element picker capturing several signals.** ✅ **Chosen.** Universal coverage with no
per-page work, and it degrades honestly.

### What the picker captures, most durable first

| Field | Example | Survives |
|---|---|---|
| `anchorKey` | `weakness.description` | everything — but only exists where someone added `data-suggest` |
| `entityType` + `entityId` | `weakness` / `uuid` | everything; parsed from route params |
| `route` | `/weaknesses/[id]` | most refactors — the **pattern**, not the URL |
| `anchorText` | `"Over laziness"` | most refactors; the visible text of the clicked element |
| `anchorPath` | `main>div:nth(2)>section` | little. A hint, never a promise |

**The ordering is the design.** A consumer resolves an anchor by trying `anchorKey`, then
`anchorText` within the route, then the path. When all three miss, the suggestion still says *which
entity on which page*, which is enough to act on.

`anchorPath` is recorded because it is free and sometimes exact. It is **not** load-bearing, and
nothing may be built that assumes it resolves.

### Entity resolution

A route→entity registry, one entry per dynamic route:

```ts
'/weaknesses/[id]'  → { entityType: 'weakness',  from: 'id' }
'/u/[username]'     → { entityType: 'user',      from: 'username' }
'/study/[id]'       → { entityType: 'study',     from: 'id' }
```

~30 lines, and it is the thing that makes "the description for *this* weakness" possible.
**A route missing from the registry still yields a valid suggestion** with `entityType: null` —
absence degrades to less precision, never to a failure.

## Decision 2 — Suggestion kinds

Five, chosen to cover what a content author actually wants to say, and no more:

| Kind | Means | Notes |
|---|---|---|
| `ADD_SECTION` | there should be content here that isn't | the primary case |
| `EDIT_COPY` | this text should say something else | **prefilled with the clicked element's text** |
| `ADD_FIELD` | show a data point that isn't shown | the "more param on the profile" case |
| `REMOVE` | this shouldn't be here | |
| `NOTE` | none of the above | the escape hatch, so nothing is lost to a taxonomy |

Prefilling `EDIT_COPY` with `currentText` is the single detail that makes this feel like editing
rather than filing a ticket. It is also what lets triage diff old against proposed.

## Decision 3 — What happens to a suggestion

Triage ends in a **conversion**, never a bare status, because a status is not an outcome:

- **→ `CmsPage` key.** The page gains a CMS slot; the existing content editor takes over
  permanently; `linkedCmsKey` records where it went.
- **→ GitHub issue.** Needs code (a new field, a new section type). `linkedIssue` records the
  number.
- **→ Declined**, with a reason the author can read.

`SHIPPED` exists separately from `ACCEPTED` so "we agreed" and "it is live" cannot be confused —
the distinction `ops/audit/02` found missing elsewhere in this repo.

## Decision 4 — One affordance, not three

There are already two floating widgets. A third makes a column of buttons in the corner.

**Collapse the cluster into one button** opening a small menu, each item shown only if the viewer
holds the capability:

```
  Report a problem     → feedback          (FEEDBACK_WIDGET)
  Suggest content      → this change       (CONTENT_SUGGEST)
  Edit content         → content editor    (CONTENT_EDIT)
```

Someone with one capability sees one item and the menu is a formality; someone with all three has
one place to look. **This subsumes the existing widgets rather than sitting beside them.**

## Decision 5 — The panel, not a modal

Suggestion mode dims the page slightly; the cursor becomes a crosshair; hovering outlines the
nearest block element with *"click to place a suggestion here"*; Escape exits.

On click, a panel slides in **from the right**. Not a modal: the author is describing what is on
the page and must keep seeing it. The existing `Dialog` primitive is wrong here for that reason.

After submit, a **pin** stays on the page marking the author's own suggestions in place. This is
the detail that makes someone leave twenty suggestions instead of two — the page visibly
accumulates their thinking.

**Open question (proposal §"Open question"):** whether pins are visible to other authors.
Defaulting to **private to the author, visible to admins** — the reversible direction.

## Decision 6 — Permission, enforced where it counts

New capability `CONTENT_SUGGEST`, using the grant machinery from #40. No new permission
infrastructure.

⚠️ **Enforced in `has-permission.ts` and asserted by a test that calls the API without the
capability and expects a refusal.** Both existing gated modes failed exactly here: `FEEDBACK_WIDGET`
was gated on the web tier while the API admitted any authenticated user, and `CONTENT_EDIT_ENABLED`
was set in no infrastructure at all. A capability that only hides a button is not a capability.

Admin visibility rides on the existing admin permission — no new role.

## Data model

```prisma
model ContentSuggestion {
  id       String @id @default(uuid()) @db.Uuid
  authorId String @map("author_id") @db.Uuid
  kind     SuggestionKind
  status   SuggestionStatus @default(NEW)

  // Where it was made. Captured, never typed.
  route       String
  url         String
  entityType  String?
  entityId    String?
  locale      String              // which language the author was reading
  anchorKey   String?  @map("anchor_key")
  anchorText  String?  @map("anchor_text")
  anchorPath  String?  @map("anchor_path")
  viewport    String?

  // What they propose.
  titleEn     String   @map("title_en")
  titleMr     String?  @map("title_mr")
  bodyEn      Json?    @map("body_en")     // Tiptap, as CmsPage already stores
  bodyMr      Json?    @map("body_mr")
  currentText String?  @map("current_text") // what was there, for EDIT_COPY

  // Where it went.
  resolution     String?
  linkedIssue    String?  @map("linked_issue")
  linkedCmsKey   String?  @map("linked_cms_key")
  triagedById    String?  @map("triaged_by_id") @db.Uuid

  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([entityType, entityId])
  @@index([route])
  @@map("content_suggestions")
}
```

`onDelete: Cascade` on the author matches `FeedbackItem`: a deleted account's suggestions go with
it. **This is a real trade-off** — accepted content advice is lost when its author leaves. It is
the right default under the anonymisation policy in `ops/data-map.md`; the escape is that an
accepted suggestion has already become a `CmsPage`, which does not cascade.

## What is deliberately not decided here

- **Whether this replaces the feedback widget eventually.** They overlap: an `ADD_SECTION`
  suggestion and an `ADDITION` feedback item are close cousins. Both stay for now; if suggestions
  absorb content-shaped feedback in practice, that is a later, evidence-based merge — not a guess
  made now.
- **Bulk export of suggestions.** Likely wanted once there are hundreds. Not before.
- **How a `CmsPage` slot is rendered on an arbitrary page.** Converting a suggestion into a slot
  needs a component that can render a CMS block in a given position, and only some pages have an
  obvious place for one. Phase 2 problem; **Phase 1 does not depend on solving it**, which is
  precisely why capture ships first.
