## Context

Verified before designing, not recalled:

- `experience-logs.service.ts` → `getOne(user: SessionUser | undefined, id)` already resolves
  guests, `ONLY_ME`, `FRIENDS` by mutual follow, drafts and the permission system, and refuses in
  a non-leaking shape. **This change adds no authorisation logic.**
- `experienceLogsApi.getOne(id)` and `queryKeys.experiences.detail(id)` already exist. The query
  key is used today only by the *edit* page.
- `/(app)/experiences/[id]/` contains only `edit/` — no `page.tsx`.
- `/(content)/community/experiences/page.tsx` lists the public pool and links each entry to
  `/u/<username>`, because there is nowhere else to point.

## The decision this change turns on

**`/(app)/experiences/[id]` cannot work, and that is not obvious from the routes.**

`(app)/layout-client.tsx` redirects anyone unauthenticated to `/login`:

```ts
if (!isAuthenticated) {
  router.replace('/login');
```

So a page there is unreachable for guests. A published `PUBLIC` log is guest-readable — the pool
already lists such logs to guests, and `getOne` explicitly handles a `undefined` user — so
putting the view in `(app)` would silently break the one visibility level that exists to be
shared. It would also strand the guest-image work from #178/#188, which was verified end to end
and has never had a page to be seen on.

### Decided: mirror blogs — the view lives in `(content)`

`/(content)/community/experiences/[id]/page.tsx`, exactly parallel to
`/(content)/community/blogs/[id]/page.tsx`.

`(content)`'s layout deliberately does not redirect either way — its own comment says content
pages there are for everyone — so one page serves guests, authors and vratmitras, with the API
deciding per viewer.

**Considered and rejected: `/experiences/[id]` under `(app)`.** It reads better as a URL and
matches where the editor lives, but it is authenticated-only, which contradicts `PUBLIC`.

**Considered and rejected: both routes.** An `(app)` view for members and a `(content)` view for
guests means two renderers for the same content, and two places for the not-found shape to be got
right. The blogs precedent already chose one page in `(content)`; matching it keeps the codebase
answering this question the same way twice rather than differently.

**Considered and rejected: restructuring the route groups** so `/experiences/<id>` can be
public. That is a navigation-wide change and belongs with #116, not behind being able to read a
log.

### Consequence, stated rather than discovered later

A private (`ONLY_ME`) log will be served from a URL containing `/community/`. That is odd to read
and carries no meaning — the path is not a promise, and the API refuses the request regardless.
Blogs already behave this way. If #37 concludes published logs deserve their own public URL
shape, that is a redirect, not a rewrite.

## Non-Goals

- Any change to `getOne` or to visibility rules.
- The #37 redesign of the community area, including anonymise-on-log and the blogs-versus-
  experiences question.
- Deciding whether a published log gets a shareable canonical URL (#37).
- Comments, reactions, or anything blogs have that experiences do not.
