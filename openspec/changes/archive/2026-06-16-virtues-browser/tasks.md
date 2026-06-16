## 1. Preflight

- [x] 1.1 Verify `prisma migrate status` clean (drift guard); no schema changes expected

## 2. Backend — virtues module

- [x] 2.1 Scaffold `apps/api/src/modules/virtues/` (module, controller, service, repository) + register in app.module; import JourneysModule for the active-journey indicator
- [x] 2.2 Repository: `listVirtues` (with subvirtue counts), `findVirtueById` (+ subvirtues), `findSubvirtueById` (+ parent virtue + tackled weaknesses + sentences), `findSentenceById` (+ subvirtue + virtue)
- [x] 2.3 Service: getVirtues / getVirtue / getSubvirtue / getSentence; sentence adds `hasActiveJourney` via JourneysService when an authed VA; 404 on unknown ids
- [x] 2.4 Controller: `GET /virtues`, `/virtues/:id`, `/subvirtues/:id`, `/sentences/:id` under OptionalSessionGuard; `{ data }` envelope
- [x] 2.5 JourneysService: add `hasActiveJourneyForSentence(userId, sentenceId)` if not present (wrap findActiveForSentence)

## 3. Backend — tests

- [x] 3.1 Virtues service spec: list + detail shapes; subvirtue includes weaknesses + sentences; sentence guest (no indicator) vs authed VA (indicator); 404 on unknown ids

## 4. Frontend

- [x] 4.1 `lib/api/virtues.ts` (getVirtues/getVirtue/getSubvirtue/getSentence) + query keys
- [x] 4.2 `(content)/virtues` browser page (Virtues primary + Weaknesses secondary, BilingualText, four states) — Weaknesses section reuses `weaknessesApi`
- [x] 4.3 `(content)/virtues/[id]` (virtue detail), `(content)/subvirtues/[id]` (subvirtue detail), `(content)/sentences/[id]` (sentence info — no journey start; CTAs route to test flow; guest soft-prompt)
- [x] 4.4 `(content)/weaknesses/[id]` guest weakness detail (reuses `GET /weaknesses/:id`; links to study test flow for authed)
- [x] 4.5 "Virtues & Weaknesses" nav entry (sidebar, under Practice); i18n en+mr at parity

## 5. Verification

- [x] 5.1 API + web typecheck clean; both production builds pass
- [x] 5.2 Full API suite green; web tests green
- [x] 5.3 Backend probe: virtues list/detail; subvirtue (weaknesses+sentences); sentence guest vs authed-VA indicator; 404s
- [x] 5.4 Rendered-UI: browser → virtue → subvirtue → sentence drill; weakness detail; guest soft-prompt on sentence CTA; bilingual; four states; mobile+desktop; console clean
- [x] 5.5 Record deferrals ("Why study weaknesses?" CMS content = Item 30; admin content management = Item 30)


## Notes

- **Verified end-to-end (guest, seeded data):** GET /virtues (6, bilingual) → /virtues/:id (subvirtues) → /subvirtues/:id (parent + 7 tackled weaknesses + 7 sentences) → /sentences/:id (subvirtue+virtue, hasActiveJourney false for guest); 404s. Browser drill-down in the (content) guest shell: virtues+weaknesses sections → virtue → subvirtue → sentence-info (no Start-journey; "Take a test" → /study); no console errors; Devanagari-primary throughout.
- **Reused (per lessons):** guest `(content)` route group + shell, OptionalSessionGuard, BilingualText, existing weaknesses list/detail endpoint (one endpoint, guest + authed pages). New `virtues` module; cross-module journey lookup via JourneysService. No schema changes, no new deps.
- **Deferred (recorded):** "Why study weaknesses?" admin-managed modal content + virtue/weakness CMS = Item 30. The sentence/weakness CTAs route into the existing study/test flow (where journeys start).
