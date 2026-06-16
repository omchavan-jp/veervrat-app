## Why

Veervrat is "sadgunachi upasana" — the pursuit of virtues. spec/21 mandates a dedicated, guest-accessible **Virtues & Weaknesses browser**: a reference surface where anyone can explore virtues → subvirtues → the weaknesses they tackle → the sentences that express them. The weaknesses list/detail already exists (Item 10), but there are no virtue/subvirtue/sentence read endpoints and no browser pages. This item adds them, reusing the guest `(content)` route group (Item 22), `OptionalSessionGuard`, and the `BilingualText` Devanagari-primary rendering.

## What Changes

- **Backend — content read endpoints (guest-accessible):** `GET /api/v1/virtues` (list — name + description excerpt + subvirtue count), `GET /api/v1/virtues/:id` (detail + subvirtues), `GET /api/v1/subvirtues/:id` (detail + parent virtue + weaknesses it tackles + its sentences), `GET /api/v1/sentences/:id` (sentence info — text + subvirtue + virtue + the requesting VA's active-journey indicator, if any). All via `OptionalSessionGuard`.
- **Frontend — browser + detail pages (guest-accessible, `(content)` group):** Virtues & Weaknesses browser (two sections: Virtues primary, Weaknesses secondary), virtue detail, subvirtue detail, sentence info page (view-only — no "Start journey"; CTAs route through a test, with a soft auth-prompt for guests), and a guest-accessible weakness detail (browse view, distinct from the authed `(app)/study/[id]` test flow). All bilingual via `BilingualText`. Nav entry "Virtues & Weaknesses".
- **Journey-start rule honored:** the browser is informational — no journey can be started from it; sentence CTAs go to weakness selection → test → result (where journeys start), per spec/21.

## Capabilities

### New Capabilities
- `virtues-content-api`: guest-accessible read endpoints for virtues (list + detail), subvirtues (detail with tackled-weaknesses + sentences), and sentences (info with active-journey indicator for an authenticated VA).
- `virtues-browser-ui`: the browser page (Virtues + Weaknesses sections) plus virtue / subvirtue / sentence-info / guest-weakness detail pages, bilingual, guest-accessible, with test-routed CTAs and guest soft-prompts.

### Modified Capabilities
<!-- The weaknesses list/detail endpoints (Item 10) are unchanged; the browser links to a new guest-accessible weakness detail page that consumes the existing endpoint. No spec-level requirement of an existing capability changes. -->

## Impact

- **New backend module:** `apps/api/src/modules/virtues/` (module, controller, service, repository, dto). Reads virtues/subvirtues/sentences; uses `JourneysService`/repository only via a service for the active-journey indicator (cross-module via service, not foreign repo) — or accepts the sentence's journey lookup through the existing `journeys` service.
- **Frontend:** new routes under `(content)` — `/virtues` (browser), `/virtues/[id]`, `/subvirtues/[id]`, `/sentences/[id]`, `/weaknesses/[id]` (guest weakness detail); `lib/api/virtues.ts` client + query keys; "Virtues & Weaknesses" nav entry. Reuse `BilingualText`, `EmptyState`, the `(content)` shell.
- **No schema changes** (all relationships exist). **No new dependencies.**
- **Permissions:** all read-only + guest-accessible; no permission rows needed (content is public per spec/09 + spec/21). The active-journey indicator is scoped to the requesting user only.
- **Deferred (recorded):** the "Why study weaknesses?" admin-managed modal content (spec/21) — the modal shell can ship with placeholder copy; admin-managed CMS content is Item 30. The sentence "Take a test / Choose a weakness" CTA wiring routes to the existing study/test flow.
