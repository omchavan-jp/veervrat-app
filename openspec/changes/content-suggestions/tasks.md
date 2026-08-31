> **Phase 1 is the deliverable.** It is capture: an author can suggest content anywhere, and an
> admin can see it. Phases 2 and 3 are follow-ups and are listed so they are not rediscovered as
> surprises — do not start them inside this change.
>
> The stated priority is **coverage of every page and section**, not depth of features. When a
> task here trades breadth for polish, it is wrong.

## 0. Read first

- [x] 0.1 `design.md` decision 1 — the anchor. Everything else is downstream of it, and the
  ordering of the signals is the design, not an implementation detail.
- [x] 0.2 `design.md` decision 6 — the capability is enforced on the API. Both existing gated
  modes failed exactly here; see `ops/audit/README.md`.

## 1. The capability

- [x] 1.1 Add `CONTENT_SUGGEST` to the capability enum and the admin grant UI, alongside
  `FEEDBACK_WIDGET` and `CONTENT_EDIT`. No new permission machinery — #40 built it.
- [x] 1.2 `content_suggestion.create` in `has-permission.ts`, requiring the capability.
- [x] 1.3 `content_suggestion.triage` requiring admin.
- [x] 1.4 **Test that the API refuses a caller without the capability**, and separately that it
  refuses after the capability is revoked. Not a test that the button is hidden.

## 2. Storage

- [x] 2.1 `ContentSuggestion` model per `design.md`, with `SuggestionKind` and `SuggestionStatus`
  enums. `SHIPPED` distinct from `ACCEPTED` — "we agreed" and "it is live" are different facts.
- [x] 2.2 Migration. Indices on `status`, `(entityType, entityId)` and `route` — the three ways
  anyone will ever look these up.
- [x] 2.3 Repository + service + controller, layered as everything else is.

## 3. The picker — the part that decides whether this works

- [x] 3.1 Suggestion mode: dim the page, crosshair cursor, outline the nearest block element on
  hover, Escape exits. Desktop only, deliberately.
- [x] 3.2 On click, capture **all four** location signals: `anchorKey` (`data-suggest` if present),
  `anchorText` (visible text, trimmed and truncated), `anchorPath` (DOM path), `viewport`.
- [x] 3.3 Route→entity registry resolving `entityType`/`entityId` from route params. **A route
  missing from the registry must still produce a valid suggestion** with no entity — absence
  degrades precision, never fails.
- [x] 3.4 Capture `route` as the **pattern** (`/weaknesses/[id]`), not the resolved URL. Store the
  URL separately for going back.
- [x] 3.5 Tests: an element with `data-suggest`, one without, a page with no dynamic entity, and
  an element whose text is long enough to need truncating.

## 4. The panel

- [x] 4.1 Slide-in panel from the right — **not** the `Dialog` primitive. The author is describing
  what is on the page and has to keep seeing it.
- [x] 4.2 Kind selector; title; body with EN/MR tabs.
  **Deviation.** This said "Tiptap body, reusing the existing editor". There is no reusable rich
  editor — the content editor edits message *strings* with a `Textarea`, and the only Tiptap
  instances are welded into the experience and blog editors. v1 captures plain text, which is the
  right trade under this change's own scope discipline: a rich editor is depth, and the priority
  is coverage. **The column still stores a Tiptap document** (`lib/suggestions/body.ts`), so
  dropping a real editor in later reads every existing row with no migration.
- [x] 4.3 `EDIT_COPY` prefills `currentText` from the clicked element. This is the detail that
  makes it feel like editing rather than filing a ticket.
- [x] 4.4 Submit, with the error surfaced from the API (`errorMessage`, #212) — not a generic
  string.

## 5. One affordance

- [x] 5.1 Collapse the floating widgets into a single button opening a menu, each item shown only
  if the viewer holds that capability.
  **Partial, deliberately.** *Report a problem* and *Suggest content* are in one launcher. **The
  content editor is not**, and folding it in would have been a redesign rather than a
  consolidation: it is a *mode* with its own multi-button toolbar (edit / staged / publish / exit),
  not an action, and rewriting a working, untested feature's entry point to fit a menu is the kind
  of change this audit spent a day cleaning up after. Two floating things for someone holding all
  three capabilities, down from three. Recorded rather than quietly dropped.
- [x] 5.2 Confirm someone holding exactly one capability still gets a sensible single-item menu,
  and someone holding none sees no button at all.

## 6. Seeing what has been said

- [x] 6.1 *My suggestions* list for an author, with the outcome and any decline reason.
- [x] 6.2 Pins on the page marking the author's own suggestions where they were placed.
- [x] 6.3 Admin triage view: every suggestion, whoever made it, filterable by status, route and
  entity.
- [x] 6.4 Triage records an outcome — `linkedCmsKey`, `linkedIssue`, or a decline reason.

## 7. Verify like a person

- [ ] 7.1 On a deployed environment, as a granted author: place suggestions on **at least four
  different kinds of page** — an entity page, a list page, a profile, and a static page — and
  confirm each records the right route and entity.
  **Attempted 2026-08-30 on UAT. Blocked, and the block is the finding — #278.** Of the four kinds
  this task names, only the profile was possible. The *Suggest content* button is absent from
  every `(content)` page: `/virtues`, `/virtues/[id]`, `/weaknesses/[id]`, `/subvirtues/[id]`,
  `/sentences/[id]`, `/pothi`, `/resources`, `/shlokas`, `/community/*`.

  `ActionLauncher` is rendered only in `(app)/layout-client.tsx`; `(content)/layout-client.tsx`
  renders no launcher at all. So a content-suggestion feature is available on the dashboard and
  not on a virtue page — the coverage is inverted, and it is silent: no error, no disabled state,
  nothing to distinguish a missing grant from a missing button.

  This task is exactly what found it. A check that could only be run on one kind of page would
  have passed.
- [x] 7.2 As an admin: see all four in the triage view, including the ones made by someone else.
  Done 2026-08-30 on UAT, across three separate accounts. A suggestion authored by the granted
  account appeared in `/admin/suggestions` for the admin account, carrying its author and its
  route: *"Add a section · on /profile · by Test Acc 2"*.

  ⚠️ **One suggestion, not four** — see 7.1. The half this task is really about is proved (triage
  shows another person's work, so the capability resolves to `triage` and not `read_own`), but the
  breadth across page kinds is not, and cannot be until #278.
- [x] 7.3 As a user **without** the capability: no button, and the API refuses a direct call.
  Done 2026-08-30 on UAT as a third account holding no grants. No *Suggest content* item in the
  launcher, and a direct `POST /content-suggestions` from the browser console returned **403**.

  ⚠️ **The first attempt returned 404 and proved nothing.** It was aimed at
  `uat.veervrat.jnanaprabodhini.org/api/v1/…` — the *web* host. The `/api/v1` rewrite proxy was
  removed on 2026-08-17, so the browser must call `api.uat.veervrat…` directly. The same attempt
  also sent `locale: 'en'` where the DTO requires `@IsIn(['EN','MR'])`, and omitted the CSRF
  header, either of which would have produced a 400.

  Worth keeping: **a 404 reads like a refusal.** Recorded as "the API refused", that first attempt
  would have been a passing check that tested nothing — the endpoint was never reached. The
  request that actually exercises the capability has to succeed at everything else first:

  ```js
  const API = 'https://api.uat.veervrat.jnanaprabodhini.org/api/v1';
  const { csrfToken } = await fetch(`${API}/auth/csrf`, { credentials: 'include' }).then(r => r.json());
  await fetch(`${API}/content-suggestions`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
    body: JSON.stringify({ kind: 'EDIT_COPY', route: '/virtues',
      url: 'https://uat.veervrat.jnanaprabodhini.org/virtues', locale: 'EN', titleEn: 'probe' })
  }).then(r => r.status)
  ```
- [ ] 7.4 Place a suggestion, then change the page it was placed on, and confirm the suggestion is
  still readable and still identifies its entity. **This is the test that says whether the anchor
  design works**; it cannot be done in a unit test.
  **Blocked by #278, and worth not faking.** Every suggestion this run could produce is anchored to
  `/profile`, because that is the only page kind in 7.1's list that has the button. Anchoring is
  only interesting on a page with real prose and a real entity — a virtue or a weakness — which is
  precisely the set that cannot carry a suggestion today.

  Also: the change this task should apply is a **code** change that restructures the page, not an
  edit through an admin tool. That is how these pages actually move, and it is the case the four
  anchor signals are ordered against. Rewriting a catalogue string through `/admin/taxonomy` would
  exercise a gentler failure than the one the design is defending against.

⚠️ 7.1–7.4 need a granted account and an admin account on a deployed environment. A check run as
one account, locally, proves nothing about either the capability or the anchors.

---

## Phase 2 — triage that converts (NOT this change)

- Convert an accepted suggestion into a `CmsPage` key, and a component that can render a CMS block
  at a given position on an arbitrary page. **The unsolved part**: only some pages have an obvious
  place for one.
- Convert into a GitHub issue from the triage view.

## Phase 3 — durable anchors (NOT this change)

- Add `data-suggest="…"` to high-traffic sections so their suggestions survive restructuring.
  Driven by where suggestions actually land, which is knowable only after Phase 1 has run.
