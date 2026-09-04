## Why

**An experience log can be written and edited, and never read.** Not by its author, not by their
vratmitra, not by a visitor to the public pool.

Verified in the routes, 2026-08-25 (#190):

```
/(app)/experiences/page.tsx                 list — my experiences
/(app)/experiences/new/page.tsx             create
/(app)/experiences/[id]/edit/page.tsx       edit
/(content)/community/experiences/page.tsx   the public pool, a list
```

`/(app)/experiences/[id]/` contains **only** `edit/`. There is no `page.tsx`, so
`/experiences/<id>` is a 404.

The public pool proves the gap by its own links: each entry links to `/u/<username>`, the
author's profile, because there is nowhere else to point. Blogs, by contrast, have
`/(content)/community/blogs/[id]/page.tsx` and behave as expected.

### Everything except the page already exists

- `GET /experience-logs/:id` — and `getOne` already resolves guests, `ONLY_ME`, `FRIENDS` by
  mutual follow, drafts and the permission system, refusing in a non-leaking shape.
- `experienceLogsApi.getOne(id)` — in the web client.
- `queryKeys.experiences.detail(id)` — used today only by the **edit** page.

So this is a missing page, not missing logic. `ExperienceVisibility` has three values, the API
enforces all three, and there is no screen on which that distinction can be observed.

### The sharpest illustration

Work landed 2026-08-25 (#178, #188) so that an image inside a *published public* experience log
renders for a logged-out visitor. That works, verified end to end. **There is no page on which
such a visitor could ever see it.** The image is reachable only by pasting its URL.

## What Changes

**1. A read view at `/experiences/[id]`.**

Renders the log's Tiptap body, its tags, its author, and when it was published. Authorisation is
whatever `getOne` says — this page asks and renders, or shows not-found. It does not re-implement
visibility, and must not: that is the mistake #178 spent a day removing from the uploads path.

**2. The lists link to it.**

"My experiences" and the public pool both currently dead-end. Linking them is the actual repair
of *"how does one even open an experience?"*

**3. The author gets an edit affordance from the view**, so read → edit is a path rather than a
URL to know.

## What This Does Not Change

- **No API change.** `getOne` is already correct and already tested.
- **No new visibility rules.** If a viewer may not read a log, `getOne` refuses; this page shows
  the same not-found it shows for a log that does not exist, because distinguishing them leaks
  existence.
- **Not the redesign.** #37 owns what the community area should become, including the
  anonymise-on-log option and the blogs-versus-experiences question. Being able to read your own
  writing should not wait for it.
- **No public URL decision.** Whether a published log gets a shareable public URL of its own,
  like blogs, is a #37 question. This change serves the log at the route the app already
  implies — `/experiences/<id>` — for everyone `getOne` permits, guests included.
