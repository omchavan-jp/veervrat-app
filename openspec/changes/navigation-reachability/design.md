## Context

Established by reading the code and the schema, not recalled. `ops/navigation-survey.md` has the
full survey; what matters here:

**The taxonomy is not a tree.**

```
Virtue  1──*  Subvirtue  1──*  Sentence
                  *──*  Weakness        (WeaknessSubvirtue, a join table)
```

A subvirtue has exactly one virtue. A sentence has exactly one subvirtue. **A weakness has many
subvirtues and therefore no single parent.**

**The data for a full ancestry is already fetched.** `/subvirtues/[id]` receives `data.virtue`;
`/sentences/[id]` receives `data.subvirtue.virtue`. Nothing new has to be queried — the sentence
page already *renders* its virtue's name, without linking it.

**Every drill-down page already has a back link**, in one of two forms, to one of two kinds of
destination.

## Goals / Non-Goals

**Goals**
- Nothing is reachable only by typing its URL, unless arriving by an emailed token is the point.
- One way back, in one place, in one form.
- The whole ancestry, so a sentence is one click from its virtue.
- A new orphan fails a test rather than waiting to be found in use.

**Non-Goals**
- Deciding what belongs in the navigation — #24.
- Breadcrumbs on pages with no hierarchy. A breadcrumb on a flat page is decoration.
- Answering #116. This fixes what is broken, not what is unsystematic.

## Decisions

### 1. No breadcrumb on `/weaknesses/[id]`, and this is the design rather than a gap

A weakness maps to many subvirtues. Any breadcrumb would have to pick one and present it as *the*
path, which is a claim the data does not support — and the page already lists all of its subvirtues
in the body, which is the honest answer.

It keeps its link to the virtues list, in the shared component's form, so the affordance is
consistent even where the ancestry is not.

**Considered and rejected: remembering where the person came from.** A `?from=` parameter or
history-based trail would produce a *path* but not an ancestry, and it breaks the moment the page
is opened from a link, a bookmark or a new tab — which is exactly when somebody needs to know where
they are. #208's `?next=` was already found to be a promise nothing honoured.

### 2. The breadcrumb renders ancestry, not history

`Virtues › Ahimsa › Patience` on a sentence page, every element but the last a link. Built from the
data the page already has, so it is correct regardless of how the page was reached.

The root is always the section list (`/virtues`), because that is where the hierarchy starts and it
gives the top level a stable name.

### 3. The public pool goes in the navigation beside blogs

`/community/blogs` is already a nav item. `/community/experiences` is its sibling in the route
tree, in the product's vocabulary, and in what it is for — other people's writing.

This is placement by parity with an existing sibling, not an IA decision: it puts a thing next to
the thing it already belongs with. **Where the `Community` group as a whole should sit, and what it
should be called, remains #24.**

### 4. `/suggestions` is reached from the launcher that creates suggestions

The launcher is where a `CONTENT_SUGGEST` grantee already goes to make one, and it is already
gated on that grant — so the entry point is visible to exactly the people the page is for, and to
nobody else. A nav item would need its own visibility rule for a page most people cannot use.

### 5. The reachability test extends the existing one rather than replacing it

`admin-pages-reachable.test.ts` already asserts every admin page is linked from the admin
dashboard. This is the same idea for the rest of the app, with the exceptions stated **as data, not
as a loosening**: routes reached by an emailed token are listed by name, so adding one is a
deliberate act that shows up in a diff.

⚠️ It asserts *reachability*, not *findability*. `/resources` is linked from one page and would
pass. That limit is written into the test, because a test whose name overstates what it checks is
how a gap gets closed on paper.

## Risks / Trade-offs

- **A nav item is a scarce slot**, and #24 may move it. Adding one now to fix a page nobody can
  find is still right; #24 can move it with everything else.
- **The breadcrumb replaces four hand-built variants.** Small regression risk on three pages,
  contained by tests that assert the ancestry each page renders.
- **The reachability test will fail for someone adding a legitimately unlinked route**, and the fix
  is to add it to the named exception list — which is the point, not an inconvenience.
