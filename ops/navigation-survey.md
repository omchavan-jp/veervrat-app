# Navigation survey — what can a person actually find?

**Measured 2026-09-01**, for #116, #253 and #33. Enumerated from the filesystem rather than from
the navigation, because a survey that starts from the nav cannot find what the nav omits — and
what the nav omits is the entire subject.

Tool: `.unlazy/navigation-survey/survey.mjs`.

⚠️ **#24 is deliberately outside this.** What Home should contain, and what the top level of the
navbar should be, are information-architecture decisions and they are Om's. This survey establishes
what is *broken*; #24 decides what it should *become*.

---

## The three tiers

Two tiers — linked or orphaned — is the wrong model, and using it made the app look healthier than
it is. What matters is how a person would find something:

| Tier | Meaning | Count |
|---|---|---|
| **IN NAV** | the left rail or pill nav points at it — findable knowing nothing | **13** |
| **FROM PAGE** | some page links to it — findable only if you are already on that page | **44** |
| **ORPHAN** | nothing links to it — reachable only by typing the URL | **10** |

67 routes total.

## The orphans, and which of them are defects

Eight of the ten are correct and should stay that way:

| Route | Why it is fine |
|---|---|
| `/verify-email`, `/reset-password`, `/set-password`, `/link-account`, `/confirm-email-change` | arrive by an emailed link carrying a token |
| `/invitations/[token]/accept`, `/settings/data-export/[token]` | same |
| `/` | redirects to `/login` |

**Two are real:**

- **`/community/experiences`** — the public experience pool. Exists, works, and nothing anywhere
  links to it. This is #253's first half, still true.
- **`/suggestions`** — where a `CONTENT_SUGGEST` author sees the suggestions they have made.
  Nothing links to it, from anywhere, including the launcher that creates them.

## The tier that matters more: reachable, but not findable

The orphan count understates the problem. Several pages are "linked" in a way that does not help
anybody:

| Route | Reachable only from |
|---|---|
| `/resources` | the bottom of `/pothi` |
| `/shlokas` | the bottom of `/pothi` |
| `/community/experiences/[id]` | three list pages — but its own list is an orphan |

**`/resources` and `/shlokas` are each reachable from exactly one place**, and that place is a page
about something else. This is what #116 means by navigation not being a system: each link was added
where somebody happened to be standing.

Recorded independently and before this survey: on 2026-08-30 both `/resources` and the public pool
had to be reached by typing the URL during a UAT verification run, by somebody who had built parts
of the app. That is the strongest evidence here — not the counts, but that the person most likely
to know where things are could not find them.

## #253 — one half fixed, one half open

| | State |
|---|---|
| The public pool is not linked from anywhere | **still true** — `/community/experiences` is an orphan |
| Public experiences on a profile are not clickable | ✅ **fixed** — `u/[username]/page.tsx` links each entry to `/community/experiences/[id]` |

## #33 — there are no breadcrumbs, anywhere

No breadcrumb component exists in the codebase. Not missing from some pages — absent from all of
them.

The drill-down chain, as built:

```
/virtues  ──→  /virtues/[id]  ──→  /subvirtues/[id]  ──→  /study
    └────────→ /weaknesses/[id] ──→ /sentences/[id]
                     └──────────────→ /virtues, /weaknesses
```

Going **down** works: every level links to the next. Coming **back up** depends on the browser
button, and on `/weaknesses/[id]` there are links back to `/virtues` and `/weaknesses` while
`/subvirtues/[id]` has none. So the way back exists on some pages, is absent on others, and is
never in a consistent place.

That inconsistency is the finding, more than the absence. A person cannot learn a rule that is only
sometimes true.

## What this survey does not establish

- **Whether people are lost.** It measures structure, not experience. Nobody has used this app in
  anger yet, so the only two data points are the two occasions somebody had to type a URL.
- **What the navigation should be.** That is #24, and it is a decision rather than a finding.
- **Mobile.** The pill nav carries the same items as the rail; whether that is right at 375px is a
  design question this does not answer.

## Method, and where it was wrong first

The first version of the tool reported **6 orphans and 61 reachable**, which would have supported a
much smaller proposal. It was wrong in three ways, each of which made the app look healthier:

1. **API client calls counted as page links.** `api.get('/resources?…')` addresses
   `/api/v1/resources`, not the page. Every content route looked linked.
2. **A link to `/community/experiences/${id}` counted as a link to `/community/experiences`.** A
   detail page and its list are different pages.
3. **Two tiers instead of three**, which is what hid `/resources` and `/shlokas` entirely.

It was caught because the tool disagreed with something already observed by hand — the pool and
`/resources` had been unreachable during a real UAT run, and the tool said they were fine. **The
observation was right and the instrument was wrong.** Worth remembering next time a tool and a
person disagree.
