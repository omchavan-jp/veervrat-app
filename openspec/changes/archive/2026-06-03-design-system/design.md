## Context

The frontend has Tailwind v4 (CSS-based config, no `tailwind.config.ts`) with partial design tokens already in `globals.css` (light mode colors only) and an `@theme inline` block mapping them to Tailwind utilities. All four fonts are already installed but Geist is configured inline in `layout.tsx` rather than in `fonts.ts`. There are no dark mode tokens, no radius/shadow/animation tokens, and no dark mode toggle. `framer-motion` and `next-themes` are not yet installed.

The existing shadcn components use `@base-ui/react` primitives rather than Radix, which is non-standard but is the current codebase choice — the state audit must work within this pattern, not fight it.

## Goals / Non-Goals

**Goals:**
- Complete the `globals.css` token set: add dark mode `.dark {}` block (all semantic colors), `--success/warning/danger`, `--radius-*`, `--shadow-*` (light + dark), `--anim-*` timing tokens
- Wire dark mode: install `next-themes`, wrap providers with `ThemeProvider`, build `ThemeToggle` component
- Consolidate font setup: move Geist Sans + Mono into `fonts.ts`, update `layout.tsx` to import from there
- Install `framer-motion` and add it to the approved library catalog
- Audit `button`, `input`, `card`, `label`, `alert`, `separator` for missing states; add where absent

**Non-Goals:**
- DB persistence of dark mode preference (that is wired in item 32 — account settings)
- Implementing Framer Motion animations on specific features (that's per-feature work)
- Adding new shadcn components not already in the project

## Decisions

### D1: Tailwind v4 CSS-custom-property approach for dark mode

Tailwind v4 uses `@theme inline` to map CSS variables to utility classes. Dark mode is applied by toggling a `.dark` class on `<html>` (via `next-themes`). The `.dark {}` block in `globals.css` overrides the same CSS variables — Tailwind picks them up automatically via `@theme inline`.

**Alternative considered:** Tailwind v4 `@media (prefers-color-scheme: dark)` — rejected because it can't respond to manual user override stored in localStorage.

**`next-themes` config:** `defaultTheme="system"`, `attribute="class"` — matches the Design System doc (default: follows system preference, manual override persists in localStorage).

### D2: Shadow tokens split by mode

The Design System specifies different shadow values for light vs dark. Since Tailwind v4's `@theme inline` reads from CSS variables, we define `--shadow-card`, `--shadow-modal`, `--shadow-toast` in `:root` for light and override them in `.dark {}`. Tailwind utilities `shadow-card`, `shadow-modal`, `shadow-toast` are available throughout the codebase automatically.

### D3: Component state approach (no Radix, base-ui primitives)

The existing components use `@base-ui/react` primitives. States are expressed through:
- Error: `aria-invalid` attribute — already handled in button and input via `aria-invalid:border-destructive` classes
- Loading: add a `loading` prop variant to Button (spinner + text replacement)
- Pressed: `active:scale-[0.98]` Tailwind class
- Focus: existing `focus-visible:ring-3` classes updated to use `--accent-2` color token

**Note on card.tsx and alert.tsx:** These likely don't exist yet or need creation as pure Tailwind components (no base-ui primitive for these).

### D4: `next-themes` added to Platform Engineering Standard

`next-themes` is not currently in the approved library catalog. It must be added before installation per the hard rule in CLAUDE.md.

## Risks / Trade-offs

- [Risk] `next-themes` `ThemeProvider` requires `'use client'` — wrapping it inside `providers.tsx` (which is already a client component) is correct. → Mitigation: `providers.tsx` already has `'use client'`; no layout boundary issues.
- [Risk] Tailwind v4's `@theme inline` does not support arbitrary `box-shadow` tokens directly via CSS variables in all contexts — some utilities need `shadow-[var(--shadow-card)]` syntax. → Mitigation: define shadow utilities via `@theme inline` using `--shadow-*` variable names; verify at build time.
- [Risk] `next-themes` flickers on first render without `suppressHydrationWarning` on `<html>` → Mitigation: add `suppressHydrationWarning` to `<html>` in `layout.tsx`.
