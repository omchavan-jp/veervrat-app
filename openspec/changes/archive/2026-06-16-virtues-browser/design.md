## Context

spec/21 defines a guest-accessible Virtues & Weaknesses browser. The data model (Virtue → Subvirtue → Sentence; Weakness ↔ Subvirtue via WeaknessSubvirtue) is fully migrated. Weaknesses list/detail endpoints + the authed study/test flow exist (Item 10). The guest `(content)` route group, `OptionalSessionGuard`, `BilingualText` (Devanagari-primary), and `JourneysRepository.findActiveForSentence` all exist. Nothing virtue/subvirtue/sentence-facing exists yet.

## Goals / Non-Goals

**Goals:**
- Guest-accessible read endpoints: virtues list/detail, subvirtue detail (tackled weaknesses + sentences), sentence info (+ active-journey indicator for an authed VA).
- Browser page (Virtues primary, Weaknesses secondary) + virtue/subvirtue/sentence-info/guest-weakness detail pages, bilingual, with test-routed CTAs and guest soft-prompts.
- Honor the journey-start rule: no journey starts from the browser.

**Non-Goals:**
- Admin CMS for virtue/subvirtue/weakness content — Item 30 (content here is read from seeded data).
- "Why study weaknesses?" rich admin-managed content — a modal shell with placeholder copy only (full CMS content = Item 30); recorded.
- Changing the existing authed weakness detail (`(app)/study/[id]`) or test flow — the browser links to a *separate* guest weakness-detail page that reuses the existing endpoint.
- Meilisearch over virtues/sentences — not required by spec/21 (the browser is browse, not search); the existing entity-search/Meili stacks remain for their own features.

## Decisions

### 1. New `virtues` module (not extending `weaknesses`)
Virtues, subvirtues, and sentences are distinct entities with their own read shapes; a dedicated `virtues` module (controller → service → repository) keeps `weaknesses` focused. **Rationale:** matches the one-module-per-domain pattern; the controller owns `/virtues`, `/subvirtues/:id`, `/sentences/:id`. (spec/27 lists these as `GET /virtues`, `GET /virtues/:id`, `GET /subvirtues/:id`.)

### 2. Guest-accessible via OptionalSessionGuard; active-journey indicator scoped to the requester
All four endpoints use `OptionalSessionGuard` (guests browse; an authed VA additionally gets `hasActiveJourney` on the sentence-info response, computed from `JourneysService.findActiveForSentence(user.id, sentenceId)` — cross-module via the journeys *service*, not its repository). **Rationale:** spec/21 — guests browse, VAs see their status overlaid; CLAUDE.md layering (service, not foreign repo).

### 3. Sentence info is informational — no journey start
The sentence-info endpoint returns text + subvirtue + virtue + active-journey indicator. The page's CTAs ("Take a test", "Choose a weakness to explore") link into the existing study/test flow (where journeys legitimately start); guests get a soft auth-prompt. No journey-creation path is exposed from the browser. **Rationale:** spec/21 journey-start rule.

### 4. Guest weakness detail reuses the existing endpoint
The browser's weakness links point to a new `(content)/weaknesses/[id]` page that calls the existing `GET /weaknesses/:id` (already OptionalSessionGuard). For a guest it shows description + linked subvirtues; for an authed VA the existing test CTAs/history are available (the page can link to `(app)/study/[id]` for the test flow). **Rationale:** don't duplicate the endpoint; reuse Item 10's work; keep the guest browse path shell-appropriate.

### 5. Bilingual rendering everywhere via BilingualText
Every virtue/subvirtue/sentence/weakness name + description uses `BilingualText` (Devanagari-primary, English secondary) — consistent with the app-wide content rule. **Rationale:** the design north-star + prior items; avoid the partial-bilingual inconsistency called out in the Cautions doc.

## Risks / Trade-offs

- **[Cross-module journey lookup]** → Done via `JourneysService` (add a thin `hasActiveJourneyForSentence(userId, sentenceId)` if not present), never the repository directly.
- **[Two weakness detail surfaces]** → One endpoint, two pages (guest browse vs authed study). The guest page is read-only; the study page owns the test flow. Clearly separated by route group; no logic duplication (shared endpoint).
- **[Empty/large content]** → Virtues/subvirtues are a small seeded set; list endpoints return all (no pagination needed at this scale, consistent with weaknesses list). Sentences per subvirtue are bounded.
- **[Guest CTA dead-ends]** → Sentence/weakness CTAs show a soft auth-prompt for guests (spec/09) rather than 401-ing or hiding silently.

## Migration Plan

No DB migration. Verify `prisma migrate status` clean before starting (drift guard). Ship backend (virtues module + endpoints) → tests → frontend (browser + detail pages + nav) → verify end-to-end (guest + authed). All read-only and additive.
