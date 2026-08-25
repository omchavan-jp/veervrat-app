## 0. Read first

- [ ] 0.1 `experience-logs.service.ts` → `getOne`. It is the authority on who may read a log, and
  this change must not restate any of it. Note it takes `SessionUser | undefined`, so a guest is
  a first-class case rather than an error.
- [ ] 0.2 `(content)/community/blogs/[id]/page.tsx` — the working precedent for a detail page in
  this codebase, including how it renders stored Tiptap content.

## 1. The page

- [ ] 1.1 `/(content)/community/experiences/[id]/page.tsx` — **not** `(app)`, see design.md:
  `(app)` redirects guests to `/login`, which would break `PUBLIC`. Fetch with
  `experienceLogsApi.getOne(id)` and `queryKeys.experiences.detail(id)` — both already exist;
  only the page does not.
- [ ] 1.2 Render the body with the same component the blog detail page uses, so stored Tiptap
  content has one renderer rather than two that drift.
- [ ] 1.3 Loading and not-found states via `QueryBoundary` / `EmptyState`, per the remediation's
  primitives. **A refusal renders exactly as a missing log** — never "you are not allowed", which
  would confirm the log exists.
- [ ] 1.4 Show author, published date, tags, and the visibility — the author should be able to
  see whether what they are reading is private, friends-only or public, since that is the whole
  point of the setting.
- [ ] 1.5 Edit affordance, author only.

## 2. Make it reachable — the actual repair

- [ ] 2.1 "My experiences" list links each entry to its view.
- [ ] 2.2 The public pool links each entry to the log, **in addition to** the existing author
  link, not instead of it.
- [ ] 2.3 Check nothing else dead-ends into `/experiences/<id>` expecting a 404 today.

## 3. Guests — RESOLVED IN DESIGN

- [x] 3.1 Route group settled. `(app)` redirects unauthenticated users to `/login`, so a view
  there is unreachable for guests and contradicts `PUBLIC`. The page goes in `(content)`,
  mirroring `(content)/community/blogs/[id]`. Experiences already match the blog route structure
  in every respect except this one missing page.
- [ ] 3.2 A guest opening a private log sees not-found, identical to a nonexistent one.

## 4. Tests

- [ ] 4.1 Renders a log the API returns.
- [ ] 4.2 A refusal renders as not-found, and the test asserts the page does **not** say anything
  that distinguishes "forbidden" from "missing".
- [ ] 4.3 The edit affordance appears for the author and not for another viewer.

## 5. Verify like a person, not only a runner

- [ ] 5.1 Open one from "my experiences", and one from the public pool.
- [ ] 5.2 Open a published PUBLIC log **logged out** — including one containing an image, which
  is the case #178/#188 made work and which has never had a page to be seen on.
- [ ] 5.3 Open an `ONLY_ME` log as another user and confirm it is indistinguishable from missing.

⚠️ Item 5.2 is the one no automated check will cover, for the same reason curl could not catch
the CORP header: a claim about what a person sees needs a person to look.
