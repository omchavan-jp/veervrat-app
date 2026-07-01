## Why

A full UI/UX audit of the web app (all 59 routes + shared components, plus a live multi-role browser walk at 375/768/1440) surfaced **458 defects** (453 static + 5 runtime): **107 high, 199 med, 147 low**, spanning correctness, state-handling, accessibility, responsiveness, design-system adoption, i18n, and token consistency.

Crucially, the audit confirmed the **design-system foundation is sound** — the token layer (`globals.css @theme inline`), dark mode, and the `@base-ui/react` primitives all render correctly; the warm Retro/Threads aesthetic holds. The problems are **inconsistent adoption** of that foundation, **missing async-state handling**, and **accessibility gaps** — not a broken design system. So this is a remediation, not a rebuild.

The 458 findings reduce to **13 root causes**, most of which can be fixed in bulk once a small set of missing primitives exists. Fixing the roots resolves clusters of leaf defects at once (the alternative — ticketing 458 individual fixes — is the "measure lines of code" anti-pattern).

## What Changes

A tiered remediation. Tier 0 builds the missing foundation so Tiers 1–3 become mostly mechanical:

- **Tier 0 — Primitive foundation (unblocks the rest).** Add missing `components/ui` primitives, all wrapping the already-installed `@base-ui/react@1.4.1` (NO new dependencies): `Textarea`, `Select`, `Spinner` (role=status + reduced-motion), `Switch`, `RadioGroup`, `ToggleGroup`, `Collapsible`, `Tooltip`, a `Field` wrapper (label/input/error association via base-ui `field`/`fieldset`), and a `Toaster`/toast hook. Extend `Button` (a `pressed`/toggle affordance + mobile touch-size) and `Input` (an `underline`/`ghost` variant to kill the repeated override string). Rebuild `StatusBanner` on top of the `Alert` primitive with semantic tokens. Each primitive ships with a unit test.
- **Tier 1 — Mechanical sweeps.** RC01 raw `<button>`/styled-`<Link>` → `Button`; RC02 extract hardcoded EN/MR literals into `messages/*` via next-intl; RC08 locale-aware dates/relative-times via `next-intl` formatter (delete the bespoke relative-time helpers); RC10 meaningful text glyphs → `lucide-react` (aria-hidden + sr-only labels); RC13 token-vocabulary sweep (`text-accent`→`text-danger`, `text-accent-2`→`text-success`, `bg-primary`→`bg-accent`, raw hex → tokens).
- **Tier 2 — Judgment sweeps.** RC03 give every query view distinct loading/error/empty states (no more "error masquerades as empty / spins forever"); RC04 default mutation `onError` → translated toast + per-instance `isPending` disabling; RC05 wire field label association + `aria-invalid`/`aria-describedby`; RC09 replace hand-rolled tab/dialog/disclosure/radio widgets with the primitives (ARIA + focus-trap + keyboard for free).
- **Tier 3 — Individual high-impact.** The ranked `topDefects` (e.g. the document-level anchor-click interceptor that breaks cmd-click; the hand-rolled exit-confirm modal; silent journey-create redirect-on-error; account-deletion via native `prompt`/`confirm`), plus **B001** (floating FAB overlaps content on mobile) and **B002** (mobile sub-44px touch targets — applied mobile-only, since the default `Button` 32px height is an intentional compact desktop aesthetic, not a bug).

Each tier is independently shippable; the checkbox-driven defect log (`/Users/omc1/Documents/om/jp/veervrat/ui-audit/UI_DEFECTS.md`) tracks per-defect completion across sessions.

## Capabilities

### New Capabilities
- `ui-component-library`: the shared `components/ui` primitive set — its required inventory, each primitive's mandatory states (default/hover/active/focus/disabled/error/loading per the Design System), accessibility contract (roles, label association, keyboard, reduced-motion), and the rule that pages compose primitives rather than re-implement controls.

### Modified Capabilities
<!-- No existing spec capability's REQUIREMENTS change; this introduces the ui-component-library capability and remediates implementations against existing specs/conventions. -->

## Impact

- **Affected code:** `apps/web/components/ui/*` (new + extended primitives), `apps/web/components/auth/status-banner.tsx` (rebuilt on Alert), and broad sweeps across `apps/web/app/**` route files + `apps/web/components/**` (button/field/state/i18n/token adoption). `apps/web/messages/en.json` + `mr.json` (new keys). `apps/web/app/(app)/layout-client.tsx` (FAB overlap + mobile touch sizes).
- **Dependencies:** none added — all primitives wrap the installed `@base-ui/react@1.4.1`; no `documentation/10_Platform-Engineering-Standard.md` change required.
- **Tests:** unit test per new primitive; existing Vitest/RTL + Playwright E2E suites must stay green; a Phase D browser re-walk verifies fixed runtime defects (FAB overlap, touch targets, dark mode) at the three viewports.
- **Risk:** low-to-moderate. Tier 0 is additive (no breakage). Sweeps are broad but mechanical and covered by typecheck + tests + the re-walk. No backend, API, DB, or permission changes.
- **Out of scope:** color-contrast formal WCAG audit, performance/bundle work, and real-device touch-gesture testing (handed off as a spot-check list).
