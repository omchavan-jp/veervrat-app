## Context

The web app was built feature-by-feature; a design system (`components/ui/*` on `@base-ui/react`, tokens in `globals.css`) exists and is sound, but pages frequently bypass it with raw HTML controls, inline color literals, and ad-hoc class strings. A 458-defect audit (453 static via a 10-agent file sweep, 5 runtime via a live Playwright walk at 375/768/1440 across all roles) distilled to 13 root causes. Key empirical findings that shape this design:

- **Foundation verified working:** dark mode renders cleanly with correct tokens; console is clean; **zero horizontal overflow at 375** on the walked routes. The static prediction that the mobile nav overflows was **refuted live** — real mobile nav is a bottom icon-bar + floating FAB.
- **`@base-ui/react@1.4.1` already ships every primitive we need** (`switch`, `radio-group`, `toggle-group`, `collapsible`, `accordion`, `select`, `field`, `fieldset`, `toast`, `tooltip`). So Tier 0 is wrapping, not adding dependencies.
- **The default `Button` is `h-8` (32px)** by design — a compact desktop aesthetic. Touch-target failures are therefore a **mobile-specific** fix (min 44px at small viewports), not a global height bump that would wreck the desktop density.

## Goals / Non-Goals

**Goals:**
- Eliminate the 13 root causes, restoring design-system consistency, async-state correctness, and accessibility, without altering the established visual language.
- Build the missing primitive foundation first so the bulk of leaf defects are fixed by mechanical adoption sweeps.
- Keep each tier independently shippable and every defect traceable via the checkbox log, so the work survives session boundaries.
- Add zero new dependencies; introduce no backend/API/DB/permission change.

**Non-Goals:**
- Redesigning the visual language, layouts, or navigation IA (the north-star is the bar, not a moving target).
- Formal WCAG contrast certification, performance/bundle optimization, real-device gesture testing (handed off).
- Changing any backend behavior.

## Decisions

**D1 — Tier 0 before sweeps.** Build/extend primitives first: `Textarea`, `Select`, `Spinner`, `Switch`, `RadioGroup`, `ToggleGroup`, `Collapsible`, `Tooltip`, `Field` wrapper, `Toaster`/`useToast`; extend `Button` (toggle/`aria-pressed` affordance, mobile touch size) and `Input` (`underline` variant); rebuild `StatusBanner` on `Alert`. Rationale: RC01/04/05/06/07/09/10/11 all depend on these existing. Additive, no breakage, each with a unit test.

**D2 — Primitives wrap `@base-ui/react`, matching the existing house pattern** (cva variants, `data-slot`, `cn()`, tokens — mirroring `button.tsx`/`input.tsx`). No Radix, no shadcn CLI, no new packages. `Field` uses base-ui `field`/`fieldset` to get label association + `aria-invalid`/`aria-describedby` for free, directly resolving RC05.

**D3 — i18n sweep reuses existing keys, centralizes duplicates.** Extract literals into `messages/en.json`+`mr.json`, reuse keys already present, collapse the three duplicated `SCORE_LABELS` maps into one `t()`-driven helper. Dates/relative-times move to `next-intl` `useFormatter` (delete the two bespoke relative-time helpers). A follow-up lint guard (`no-literal-jsx-text` style) prevents regression.

**D4 — State handling standardized via a shared pattern.** Introduce a small `QueryBoundary` (loading→`Spinner`, error→`Alert`+retry, empty→`EmptyState`) so RC03 is fixed uniformly and `isError` can never collapse into the empty state. Mutations get a default `onError` (translated toast) at the QueryClient level + per-instance `isPending` keyed by `variables` so only the active row disables (fixes the "all accept buttons disable at once" class).

**D5 — Touch targets fixed mobile-only.** Add `min-h-11`/`min-w-11` to interactive controls at `<sm` breakpoints (header icon-buttons, nav, score buttons) and reserve bottom padding for the FAB/bottom-bar (CSS var driven, env-safe-area aware) — preserving desktop compactness.

**D6 — Sequencing within sweeps:** primitives → mechanical (button/i18n/dates/glyphs/tokens) → judgment (state/a11y) → individual high-impact. Verify with typecheck + unit/E2E + a Phase D browser re-walk of the runtime defects.

**D7 — Execution model.** Broad mechanical sweeps (RC01/02/10/13) are well-suited to parallel sub-agents scoped per route-group, each editing disjoint files, then a typecheck/test gate. Judgment sweeps and Tier 3 are done directly with review. This keeps the 458-item volume tractable within context limits.

## Risks / Trade-offs

- **Broad blast radius of sweeps.** Mitigation: Tier 0 additive; sweeps gated by `tsc --noEmit`, Vitest/RTL, Playwright E2E, and the Phase D re-walk; one tier per commit for clean revertability.
- **i18n sweep can miss MR parity or break interpolation.** Mitigation: enforce en/mr key parity check (the repo already has parity discipline), keep ICU args intact, spot-render MR in the browser.
- **`Field`/`Toaster` introduce shared patterns many files adopt at once.** Mitigation: land the primitive + tests first, adopt incrementally per route-group, never in one mega-commit.
- **Refuted static claims** (e.g. mobile pill overflow) mean some static findings are noise. Mitigation: Phase D re-walk is the source of truth for runtime/responsive items; static findings are cross-checked before fixing where they assert rendered behavior.
- **Context exhaustion across 458 items.** Mitigation: checkbox log is the durable interface; each session claims a slice; foundation-first ordering means later sessions inherit a stable base.
