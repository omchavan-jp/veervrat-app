## Why

The frontend currently has partial color tokens (light mode only) and no dark mode, no radius/shadow/animation tokens, and no dark mode toggle — making consistent theming impossible and leaving the design system half-implemented. This must be done before any feature UI is built so every screen shares the same visual language.

## What Changes

- Add all missing CSS custom properties to `globals.css`: dark mode `.dark {}` block, `--success/warning/danger` semantic colors, `--radius-*` tokens, `--shadow-*` tokens, `--anim-*` timing tokens
- Install and configure `next-themes` for dark mode toggle (system preference default, persisted in localStorage + future DB sync)
- Add dark mode toggle component accessible from settings page and sidebar footer
- Consolidate Geist font setup into `fonts.ts` (currently split between `layout.tsx` inline and `fonts.ts`)
- Install `framer-motion` (required by Design-System.md, used for peak animations throughout the app)
- Audit existing shadcn/ui components (`button`, `input`, `card`, `label`, `alert`, `separator`) and update to meet component state spec: error state, loading state, pressed scale, focused ring using `--accent-2`

## Capabilities

### New Capabilities

- `design-system`: CSS design tokens (complete light + dark), next-themes dark mode, font consolidation, Framer Motion installation, component state spec compliance

### Modified Capabilities

- `i18n`: No requirement changes — dark mode toggle is a new component, not a locale change

## Impact

- `apps/web/app/globals.css` — extended with missing tokens + dark mode block
- `apps/web/app/fonts.ts` — Geist Sans + Geist Mono moved here from `layout.tsx`
- `apps/web/app/layout.tsx` — font imports updated to use `fonts.ts`
- `apps/web/components/ui/button.tsx`, `input.tsx`, `card.tsx` — state updates
- `apps/web/components/shared/theme-toggle.tsx` — new component
- `apps/web/lib/providers.tsx` — wrap with `ThemeProvider` from next-themes
- New dependency: `framer-motion`, `next-themes`
- `documentation/Platform-Engineering-Standard.md` — add `next-themes` to approved library catalog
