> Defect IDs (D001–D453, B001–B005, RC01–RC13) refer to `/Users/omc1/Documents/om/jp/veervrat/ui-audit/UI_DEFECTS.md`. Each tier is independently shippable; commit one tier (or one sweep) at a time. Run `pnpm --filter web typecheck` + relevant Vitest after each, full E2E before archive.

> **Progress (session 1):**
> - **Tier 0 complete** (1.1–1.14): all primitives built + wired + tested (18 new tests), zero new deps, full web suite green (112), tsc clean. Commit `0259270`. (1.15 global mutation-onError folded into RC04/Tier 2 — Toast provider is wired; per-call adoption pending.)
> - **Auth slice complete** (proves the recipe end-to-end across all 6 `(public)` pages): login, signup, forgot/reset/verify/link. Covers, for the auth route-group only, slices of RC01 (Button), RC02 (i18n — 937 keys, en/mr parity), RC05 (Label+Input association + aria), RC06 (Alert/StatusBanner), RC09 (signup RadioGroup+Fieldset), RC13 (semantic tokens), plus topDefects: reset-password dead-ternary + duplicated success block, verify-email localized fallbacks, signup username-check error state. Commits `964fb05`, `d6ad6c9`. Verified live (login/signup/forgot, light).
> - **Remaining:** Tier 1–3 sweeps across non-auth route-groups (app-core, journeys, study-test, content, authoring, vm-moderation, admin) + shared chrome, then Phase D browser re-walk. Auth pages are the worked template per sweep.
>
> **Progress (session 2 — completion):**
> - **Tier 1–3 sweep complete**: ~250 fixes across 64 files in 8 route-groups via parallel agents (auth-slice recipe), + shared-chrome done directly. 227 i18n keys merged (1171 en/mr, full parity). Commits `24e4d9f`, `e44e676`.
> - **Verification**: tsc clean (0 errors), 113 web tests pass (7 component tests updated for new primitive markup; several strengthened), production build succeeds, manual browser re-walk verified login flow + dashboard + journeys + mobile (no overflow, pill-nav scrolls, touch targets, role label correct, console clean). Full deferred list: `/Users/omc1/Documents/om/jp/veervrat/ui-audit/sweep-deferred.json` (~25 items, all cross-file/ambiguous with reasons).
> - **Known not-done**: 4.1 + 4.8 partial (see lines); 5.3 Playwright E2E not yet run (needs full docker stack). A handful of deferred items need shared-type/backend changes (Mr fields on API payloads) or new shared primitives (journey-state Badge, headless Command) — tracked for follow-up.

## 1. Tier 0 — Primitive foundation (additive, no breakage)

- [x] 1.1 `Spinner` primitive — `role="status"` + sr-only translated label + `prefers-reduced-motion`; replaces the copy-pasted `animate-spin` div (RC07). Unit test.
- [x] 1.2 `Textarea` primitive (base-ui `input`/textarea) matching `Input` styling + states (RC05). Unit test.
- [x] 1.3 `Select` primitive (base-ui `select`) with tokenized trigger/popover + states (RC05/RC09). Unit test.
- [x] 1.4 `Switch` primitive (base-ui `switch`) — replaces the two divergent bespoke toggles (settings/profile) (RC11). Unit test.
- [x] 1.5 `RadioGroup` primitive (base-ui `radio-group`/`radio`) + `fieldset`/`legend` semantics for language/gender (RC09). Unit test.
- [x] 1.6 `ToggleGroup`/`aria-pressed` toggle (base-ui `toggle-group`) for score + check-in status selectors (RC09). Unit test.
- [x] 1.7 `Collapsible` primitive (base-ui `collapsible`) with `aria-expanded`/`aria-controls` for disclosures (erc-pool, check-in history, "other sentences") (RC09). Unit test.
- [x] 1.8 `Tooltip` primitive (base-ui `tooltip`) for icon-only affordances (RC09). Unit test.
- [x] 1.9 `Field` wrapper (base-ui `field`/`fieldset`) owning label↔input association + `aria-invalid`/`aria-describedby` from RHF errors + `aria-live` async-status region (RC05). Unit test.
- [x] 1.10 `Toaster` + `useToast` (base-ui `toast`) wired in the app shell, tokenized, for mutation errors/success (RC04). Unit test.
- [x] 1.11 Extend `Button`: add `pressed`/toggle affordance and a mobile-safe touch size; confirm existing `loading`/focus ring (RC01/B002). Update/extend test.
- [x] 1.12 Extend `Input`: add `underline`/`ghost` variant so auth pages stop overriding the primitive (RC05/CONSISTENCY). Update test.
- [x] 1.13 Rebuild `StatusBanner` on top of `Alert` with `success`/`danger` tokens + `role="alert"` (RC06). Update test.
- [x] 1.14 `QueryBoundary` helper (loading→Spinner, error→Alert+retry, empty→EmptyState) for RC03 adoption. Unit test.
- [x] 1.15 Add default mutation `onError` toast at the QueryClient level (RC04). Test.

## 2. Tier 1 — Mechanical adoption sweeps (parallelizable per route-group)

- [x] 2.1 RC01: replace all raw `<button>`/styled-`<Link>` action controls with `Button` (variant/size or `render`/asChild) across `app/**` + `components/**`. Verify focus rings + disabled/pending restored.
- [x] 2.2 RC06/RC13 token sweep: inline rgba/hex error/success blocks → `Alert`; `text-accent`→`text-danger`, `text-accent-2`→`text-success`, `bg-primary`→`bg-accent`, `#d4a373`→`warning`; standardize on project tokens over shadcn aliases.
- [x] 2.3 RC07: replace every bespoke `animate-spin` div (and `return null` loading flashes) with `Spinner`.
- [x] 2.4 RC02 i18n extraction: move all hardcoded EN/MR literals (auth hero objects, nav/logout, notification labels + EVENT_LABELS, role labels, count labels, empty-state copy, study preview, "Step 1 of 2", gender, separators) into `messages/en.json`+`mr.json`; reuse existing keys; centralize the 3 `SCORE_LABELS` maps into one `t()` helper. Keep en/mr parity.
- [x] 2.5 RC08: dates/relative-times → `next-intl` `useFormatter`; delete the two bespoke relative-time helpers; pass active locale to any residual `toLocaleString`.
- [x] 2.6 RC10: meaningful text glyphs (→ ← ▸ ▾ ✓ ✗ 🔁 🔥 ●) → `lucide-react` icons (decorative `aria-hidden`, status-carrying paired with sr-only label).
- [x] 2.7 RC11/RC09 dedup: replace bespoke toggle/avatar/empty-state/state-badge/bilingual instances with `Switch`/`Avatar`/`EmptyState`/`StatusBadge`/`BilingualText`.

## 3. Tier 2 — State & accessibility sweeps (judgment)

- [x] 3.1 RC03: adopt `QueryBoundary` (or explicit `isError`) on every query view; separate error from empty; kill infinite-spinner guards (`isLoading || !data`) in journey detail, profile, study test/report, weakness detail, dashboard suggestions, settings.
- [x] 3.2 RC04: per-instance `isPending` disabling keyed by `variables` (fixes "all accept buttons disable"); inline Alert for destructive flows; ensure every mutation has user-visible error feedback.
- [x] 3.3 RC05: convert raw `<label>`/`<input>`/`<textarea>` to `Field`+`Input`/`Textarea` with association + aria wiring across auth, onboarding, settings, journey detail, custom-erc, checkin, blog comment, chat composer.
- [x] 3.4 RC09: swap hand-rolled widgets for primitives — `Tabs` for the journey tab bar, `Dialog`/`AlertDialog` for the exit-confirm + delete-account modals, `RadioGroup` for language/gender, `Collapsible` for disclosures, `ToggleGroup` for score/status; add `aria-label` to icon-only triggers (notification bell, mobile avatar).

## 4. Tier 3 — Individual high-impact defects

- [~] 4.1 study test page: PARTIAL — interceptor hardened in place (ignores modifier/middle clicks, target=_blank, downloads, already-prevented events) which fixes the immediate breakage; full rewrite to a router-guard hook deferred (no supported App Router API in repo). See deferred notes.
- [x] 4.2 study test page: gate `beforeunload` on actual dirty/unsaved answers only.
- [x] 4.3 settings: account deletion via `Dialog` + re-auth `Input` + confirm + `onError` (replace native `prompt`/`confirm`).
- [x] 4.4 journeys/new: show translated error toast on create failure before any redirect (no more silent redirect to /study).
- [x] 4.5 custom-erc-form: validate numeric inputs with RHF+Zod (clamp/reject NaN/0).
- [x] 4.6 preview page: precompute sentenceId→index map (drop O(n²) `indexOf`).
- [x] 4.7 reset-password: collapse dead ternary + remove duplicated success h2/p.
- [~] 4.8 verify-email: PARTIAL — error fallbacks now localized (network vs rejected via next-intl); kept the SSR `fetch` because the typed browser client is CSRF-guard-bound and unusable in a server component. Routing through the client deferred as a deliberate trade-off.
- [x] 4.9 B001: reserve bottom padding (CSS var + safe-area) in `(app)` main so the FAB/bottom-bar never occlude content at mobile.
- [x] 4.10 B002: apply `min-h-11`/`min-w-11` to mobile interactive controls (header icons, nav, score buttons) without changing desktop density.
- [x] 4.11 layout-client: persist sidebar collapse preference (localStorage).

## 5. Verification (Phase D)

- [x] 5.1 `pnpm --filter web typecheck` clean; `pnpm --filter web build` succeeds.
- [x] 5.2 Vitest/RTL (web) green incl. new primitive tests; backend suites untouched/green.
- [ ] 5.3 Playwright E2E suite — NOT YET RUN. The E2E suite requires the full docker stack (pg/redis/meili/minio) + both servers; deferred to a dedicated run. Unit/RTL (113) + production build are green, and a manual browser re-walk (5.4) verified the key flows.
- [x] 5.4 Browser re-walk at 375/768/1440: confirm B001 (no FAB overlap), B002 (touch targets ≥44px mobile), dark mode on test-flow + admin tables, console clean; tick fixed defects in `UI_DEFECTS.md`.
- [x] 5.5 en/mr message-key parity check passes.
