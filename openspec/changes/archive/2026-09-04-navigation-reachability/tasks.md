## 0. Read first

- [x] 0.1 `design.md` decision 1 — a weakness has **many** subvirtues, so it gets no breadcrumb.
  Adding one there is the most likely mistake in this change, because #33's title asks for exactly
  that and the data does not support it.
- [x] 0.2 `ops/navigation-survey.md` → "Method, and where it was wrong first". The first survey
  tool reported 6 orphans instead of 10 and would have justified a smaller change. It was caught
  by disagreeing with something observed by hand.

## 1. The two unreachable pages

- [x] 1.1 `/community/experiences` in the nav, beside `/community/blogs`. Both rail and pill nav —
  they read from the same array, so confirm rather than assume.
  Confirmed: `PRACTICE` is rendered by the rail (line 269) and spread into `pill` (line 123). One
  array, both navs. Given a distinct icon — `Sparkles` was already `/virtues`.
- [x] 1.2 A nav label in `en.json` and `mr.json`, parity passing.
- [x] 1.3 `/suggestions` reachable from the action launcher, for holders of `CONTENT_SUGGEST` only.
- [x] 1.4 Confirm neither page needs a new permission to be listed — the pool is guest-browseable
  content and the launcher is already grant-gated.

## 2. One way back

- [x] 2.1 A `Breadcrumbs` component: a list of `{ href, label }`, last item current and unlinked,
  `aria-label` naming it, and `aria-current="page"` on the last.
- [x] 2.2 Bilingual labels — every crumb is an entity name, so it goes through `ContentText`, the
  same as the names already rendered on those pages.
- [x] 2.3 `/virtues/[id]`: `Virtues › {virtue}`.
- [x] 2.4 `/subvirtues/[id]`: `Virtues › {virtue} › {subvirtue}`, from `data.virtue`.
- [x] 2.5 `/sentences/[id]`: `Virtues › {virtue} › {subvirtue} › {sentence}`, from
  `data.subvirtue.virtue`. **This is the one that gains something** — today it reaches its virtue
  in two hops through a page nobody wanted.
- [x] 2.6 `/weaknesses/[id]`: **no breadcrumb.** Its existing link to the virtues list stays, moved
  to the shared form so the affordance matches even where the ancestry does not exist.
- [x] 2.7 Delete the four hand-built back links, so there is one implementation and not five.

## 3. The test that stops this recurring

- [x] 3.1 A structural test: every route under `app/` is in the nav, linked from some page, or on a
  named exception list.
- [x] 3.2 The exception list holds **routes reached by an emailed token** and the root redirect, by
  name, with the reason beside each.
- [x] 3.3 Assert it can fail — a deliberately unlinked fixture route must break it. A test that
  cannot fail is the thing this whole change set keeps finding.
- [x] 3.4 ⚠️ The test name and its comment must say it checks **reachability, not findability**.
  `/resources` is linked from one page and passes; that is a real limit and must not be papered
  over by a name that claims more.

## 4. Verify like a person

- [x] 4.1 On a deployed environment: reach the public pool from the navigation, without typing a
  URL.
  Verified 2026-09-04 on UAT: `/community/experiences` reachable from the rail nav.
- [x] 4.2 As a `CONTENT_SUGGEST` holder, reach `/suggestions` from the launcher.
  Verified 2026-09-04 on UAT: visible in the action launcher.
- [x] 4.3 Walk `Virtues → a virtue → a subvirtue → a sentence` and come back up using only the
  breadcrumb. Then do it in Marathi, since every crumb is an entity name.
  Verified 2026-09-04 on UAT in both languages. English: `Virtues › Entrepreneurship ›
  Ambition/Grandeur › {sentence}`. Marathi: `सद्गुण › उद्यमशीलता › महत्त्वाकांक्षा/भव्यता ›
  {sentence}`. All crumb links navigated correctly.
- [x] 4.4 Confirm `/weaknesses/[id]` still gets you back, and does **not** claim a parent.
  Verified 2026-09-04 on UAT: `BackLink` shows "< Virtues & Weaknesses", no breadcrumb
  hierarchy claimed. Navigating from a subvirtue to a weakness correctly drops the breadcrumb
  — discussed with user, accepted as correct for now; referrer-aware crumbs deferred.

⚠️ 4.3 needs both languages. The crumbs are content, not interface copy, so an English-only walk
would not exercise `ContentText` at all.
