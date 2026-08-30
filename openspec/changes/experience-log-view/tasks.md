## 0. Read first

- [x] 0.1 `experience-logs.service.ts` → `getOne`. It is the authority on who may read a log, and
  this change must not restate any of it. Note it takes `SessionUser | undefined`, so a guest is
  a first-class case rather than an error.
- [x] 0.2 `(content)/community/blogs/[id]/page.tsx` — the working precedent for a detail page in
  this codebase, including how it renders stored Tiptap content.

## 1. The page

- [x] 1.1 `/(content)/community/experiences/[id]/page.tsx` — **not** `(app)`, see design.md:
  `(app)` redirects guests to `/login`, which would break `PUBLIC`. Fetch with
  `experienceLogsApi.getOne(id)` and `queryKeys.experiences.detail(id)` — both already exist;
  only the page does not.
- [x] 1.2 Render the body with the same component the blog detail page uses, so stored Tiptap
  content has one renderer rather than two that drift.
- [x] 1.3 Loading and not-found states via `QueryBoundary` / `EmptyState`, per the remediation's
  primitives. **A refusal renders exactly as a missing log** — never "you are not allowed", which
  would confirm the log exists.
- [x] 1.4 Show author, published date, tags, and the visibility — the author should be able to
  see whether what they are reading is private, friends-only or public, since that is the whole
  point of the setting.
- [x] 1.5 Edit affordance, author only.

## 2. Make it reachable — the actual repair

- [x] 2.1 "My experiences" list links each entry to its view.
- [x] 2.2 The public pool links each entry to the log, **in addition to** the existing author
  link, not instead of it.
- [x] 2.3 Check nothing else dead-ends into `/experiences/<id>` expecting a 404 today.
  Checked 2026-08-29, and something did: a public profile rendered its experience entries as
  plain text, so the one place a person meets somebody else's writing went nowhere. The public
  pool already carried the link, added when the log got a page (#190) — the profile was never
  given the same treatment and nothing connected the two files. Filed as #253, fixed in #256,
  re-tested: the entry opens.

## 3. Guests — RESOLVED IN DESIGN

- [x] 3.1 Route group settled. `(app)` redirects unauthenticated users to `/login`, so a view
  there is unreachable for guests and contradicts `PUBLIC`. The page goes in `(content)`,
  mirroring `(content)/community/blogs/[id]`. Experiences already match the blog route structure
  in every respect except this one missing page.
- [x] 3.2 A guest opening a private log sees not-found, identical to a nonexistent one.

## 4. Tests

- [x] 4.1 Renders a log the API returns.
- [x] 4.2 A refusal renders as not-found, and the test asserts the page does **not** say anything
  that distinguishes "forbidden" from "missing".
- [x] 4.3 The edit affordance appears for the author and not for another viewer.

## 5. Verify like a person, not only a runner

- [ ] 5.1 Open one from "my experiences", and one from the public pool.
  **Half done 2026-08-29.** "My experiences" opens. The public pool could not be reached: it is
  not linked from anywhere, and the profile — the one place a person meets somebody else's
  writing — rendered entries that were not clickable. Filed as #253; the profile half is fixed in
  #256. Reaching the pool is a navigation question left to #24/#116, so this task stays open
  until there is a route to it a person would find.

- [x] 5.2 Open a published PUBLIC log **logged out** — including one containing an image, which
  Done 2026-08-29, in a private window on UAT. The page rendered and the image loaded — the case
  this task warns no automated check covers, for the same reason `curl` could not catch the CORP
  header: a 200 and the right bytes are not the same as a browser agreeing to display it.
  is the case #178/#188 made work and which has never had a page to be seen on.
- [x] 5.3 Open an `ONLY_ME` log as another user and confirm it is indistinguishable from missing.
  Done 2026-08-29: "Experience not found", both signed in as a different account and signed out.
  The same answer a genuinely absent log gives, which is the point — anything else would confirm
  it exists.

⚠️ Item 5.2 is the one no automated check will cover, for the same reason curl could not catch
the CORP header: a claim about what a person sees needs a person to look.


## 6. Note from implementation

`use(params)` suspends, so a test that renders this page needs both a `Suspense` boundary and an
**async** `act` — a synchronous render leaves the tree in fallback forever, with an empty DOM and
the query never fired. Worth knowing before writing the next App Router page test; the first
attempt looked like a broken mock and was neither.

The edit affordance is asserted as a link to `/experiences/<id>/edit` rather than by accessible
name, because the name is assembled from an icon plus text. What matters is that the author can
get there.
