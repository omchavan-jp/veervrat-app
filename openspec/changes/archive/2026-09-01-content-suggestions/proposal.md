## Why

**Someone who knows what the content should say has no way to say it in the place it belongs.**

Today a content author who opens `/study` for a weakness and thinks *"there should be a
description section here, and here is what it says"* has three options, and all three lose the
thing that matters:

1. **The feedback widget** — captures `route`, `locale`, `viewport`, `commitSha` and free text. It
   records *which page*, never *where on the page* or *which weakness*. "Add a description to the
   study page" is unactionable a week later when nobody remembers which weakness was on screen.
2. **The content editor** — edits real content and publishes a GitHub PR
   (`content-overrides/github-publisher.ts`). But it can only edit what is **already** a
   `CmsPage`. It cannot propose content in a place that holds none.
3. **Tell someone.** Which is what happens, and it does not survive the conversation.

### The gap, stated precisely

> **Feedback is capture without precision. The content editor is precision without capture.**

The need falls exactly between them: **point at anywhere, and propose content that does not exist
yet.**

This is not a nicety. The product's substance is its content — virtues, weaknesses, sentences,
study material, the pothi — and the people who know that material best are not the people who can
open a pull request. Every hour of their attention that fails to reach the repository is the
scarcest thing this project has, wasted.

## What changes

A third mode alongside the two that exist, sharing their machinery:

- **An element picker.** Enter suggestion mode on any page, click any part of it, describe what
  should be there. Works on **every page and every entity from day one**, with no per-page work.
- **Anchored capture.** Each suggestion records where it was made — route pattern, entity type and
  id, and three signals locating the element — so it is still actionable months later.
- **Bilingual content.** A suggestion carries EN and MR bodies as Tiptap JSON, the same shape
  `CmsPage` already uses.
- **Admin triage that ends in a conversion**, not a status. A suggestion becomes a `CmsPage` key,
  or a GitHub issue, or a decline with a reason.

### The graduation path — why this feature shrinks over time

A pile of suggestions nobody can act on is worse than no suggestions. So the end state of an
accepted suggestion is a **CMS slot on that page**. Once the slot exists, the **existing content
editor owns it** and the author edits it directly, with no suggestion in the loop.

**The suggestion tool is for the frontier.** Places graduate off it. That is the design's main
defence against becoming a second backlog nobody reads.

## What this is NOT

Scope discipline, because the stated priority is *coverage of every page and section*, not depth
of features. Deliberately excluded from this change:

- threading, replies, mentions
- upvotes and any social signal (feedback has them; this is not a popularity contest — one
  person's suggestion about content they know is not improved by votes from people who do not)
- notifications
- **image attachments** (decided out with Om, 2026-08-27 — binding uploads to a suggestion is real
  work and no early suggestion needs it)
- a mobile picker — desktop-only is honest for a content author working through pages
- per-kind custom forms; one form with a kind selector
- editing another person's suggestion

## Decisions taken with Om, 2026-08-27

1. **Administered like feedback and content.** Capability-gated for authors; **every suggestion is
   visible to admins**, in one place. Authors see their own.
2. **No image attachments in this change.**

## Open question for design

**Whether an author sees other authors' pins on a page.** Admin-visible is settled; author-to-author
is not. Shared pins prevent two people describing the same gap twice; private pins avoid a page
crowded with other people's opinions. Recorded in `design.md`, defaulting to **private to the
author, visible to admins**, because it is the reversible direction.

## Risks worth stating before building

- **DOM-path anchors rot.** A redeploy that restructures a page can orphan the precise location.
  Mitigated by capturing entity + route + the element's visible text, which survive most
  refactors — never by pretending the path is stable.
- **A Marathi suggestion needs a Marathi reader.** This change cannot solve that; it can only make
  the language of each suggestion explicit so the need is visible.
- **This is a third capability-gated mode, and both existing ones drifted.** `FEEDBACK_WIDGET`'s
  gating was cosmetic — the env var reached only the web tier while the API admitted any
  authenticated user — and `CONTENT_EDIT_ENABLED` was read by code and set in no infrastructure,
  leaving the capability inert (#40, and `ops/audit/README.md`). **The capability here is enforced
  on the API, and a test asserts a caller without it is refused.** Not a widget that hides itself.
