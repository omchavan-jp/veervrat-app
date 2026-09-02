## Why

**Two pages cannot be found at all, and the way back out of the content is inconsistent.** From the
survey in `ops/navigation-survey.md` (2026-09-01), which enumerated all 67 routes from the
filesystem rather than from the navigation — a survey starting from the nav cannot find what the
nav omits.

### Two pages nothing links to

- **`/community/experiences`** — the public experience pool. It exists and works. Nothing anywhere
  links to it, so the only way in is to already know the URL. This is #253's first half, still
  true, and it blocks `experience-log-view` task 5.1, which asks for a log to be opened "from the
  public pool".
- **`/suggestions`** — where a `CONTENT_SUGGEST` author sees the suggestions they have made.
  Nothing links to it, including the launcher that creates them.

Both were reached during real UAT runs only by typing the URL, by somebody who had built parts of
the app. That is the evidence that matters here — not the counts.

### The way back is two different things

Every page in the virtue drill-down has a back link. That was the surprise: the problem is not
absence, it is that no two are the same.

| Page | Goes back to | Affordance |
|---|---|---|
| `/virtues/[id]` | the virtues list | `<ArrowLeft/>` icon + "back to browser" |
| `/subvirtues/[id]` | its parent virtue | `<ArrowLeft/>` icon + the virtue's name |
| `/sentences/[id]` | its parent subvirtue | a literal `←` character + the subvirtue's name |
| `/weaknesses/[id]` | the virtues list | a literal `←` character + "back to browser" |

Two icons for one idea, two kinds of destination, and never more than one level of ancestry — so
getting from a sentence to its virtue takes two hops through a page you did not want.

A person cannot learn a rule that is only sometimes true. That is #33, and it is a smaller and more
tractable problem than "there are no breadcrumbs", which is what the issue title implies.

## What Changes

- The public experience pool is reachable from the navigation, beside the blogs it already sits
  next to in the product's own vocabulary.
- An author can reach their own suggestions from the launcher that makes them.
- One breadcrumb component, showing the **whole** ancestry, on the three pages where an ancestry
  exists — replacing four hand-built variants.
- A structural test: a new route must be reachable, or it fails. This category has recurred —
  `/admin/suggestions` was built and linked from nowhere, and `admin-pages-reachable.test.ts`
  exists because of it. This extends the same idea past `(admin)`.

## Impact

- `apps/web/components/layout/app-shell.tsx` — one nav item.
- `apps/web/components/shared/launcher/action-launcher.tsx` — one action.
- `apps/web/components/shared/breadcrumbs.tsx` — new.
- `apps/web/app/(content)/{virtues,subvirtues,sentences}/[id]/page.tsx` — adopt it.
- Spec delta: `navigation`.

**Explicitly not in this change**, and stated so it is not mistaken for an oversight:

- **`/weaknesses/[id]` gets no breadcrumb.** A weakness maps to *many* subvirtues
  (`WeaknessSubvirtue` is a join table), so it has no single parent and a breadcrumb would assert a
  hierarchy that does not exist. Its existing link to the virtues list stays, in the shared form.
- **`/resources` and `/shlokas`** are each reachable from exactly one page. Whether they belong in
  the navigation is an information-architecture question, which is **#24** and Om's.
- **#116 stays open.** This fixes what is demonstrably broken; whether navigation is a coherent
  system is the larger question it asks.
