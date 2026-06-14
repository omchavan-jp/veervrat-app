# Design System Spec

### Requirement: CSS tokens cover complete light and dark mode
`apps/web/app/globals.css` SHALL define all design tokens as CSS custom properties. The `:root` block SHALL contain light mode values for: `--bg`, `--fg`, `--accent`, `--accent-hover`, `--accent-2`, `--muted`, `--surface`, `--border`, `--border-strong`, `--success`, `--warning`, `--danger`. The `.dark` block SHALL override all color tokens with dark mode values per `documentation/15_Design-System.md`. Both blocks SHALL include: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-full` (9999px). Both blocks SHALL include: `--shadow-card`, `--shadow-modal`, `--shadow-toast` with mode-appropriate values. The `:root` block SHALL include animation timing tokens: `--anim-micro` (150ms ease-out), `--anim-transition` (250ms ease-out), `--anim-page` (400ms ease-in-out). The `@theme inline` block SHALL map all tokens to Tailwind utility classes.

#### Scenario: Dark mode token overrides light mode
- **WHEN** the `.dark` class is present on `<html>`
- **THEN** `--bg` resolves to `#1A1816`, `--fg` to `#F5F0EA`, and `--accent` to `#D4694A`

#### Scenario: Radius tokens available as Tailwind utilities
- **WHEN** a component uses class `rounded-md`
- **THEN** it renders with `border-radius: 8px` (mapped via `--radius-md`)

#### Scenario: Shadow tokens available as Tailwind utilities
- **WHEN** a component uses class `shadow-card` in light mode
- **THEN** it renders with `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`

#### Scenario: Animation timing tokens defined
- **WHEN** CSS reads `var(--anim-transition)`
- **THEN** it resolves to `250ms`

### Requirement: Dark mode toggled via next-themes with system default
The app SHALL use `next-themes` `ThemeProvider` with `attribute="class"` and `defaultTheme="system"`. The `ThemeProvider` SHALL wrap the entire app via `apps/web/lib/providers.tsx`. The `<html>` element in `apps/web/app/layout.tsx` SHALL have `suppressHydrationWarning` to prevent flicker. Dark mode preference SHALL persist in localStorage automatically via next-themes.

#### Scenario: First visit with dark system preference
- **WHEN** a new visitor's OS is in dark mode and no localStorage preference exists
- **THEN** the page renders with the `.dark` class on `<html>` (system default)

#### Scenario: User manually switches to light mode
- **WHEN** the user activates the light mode option in the theme toggle
- **THEN** the `.dark` class is removed from `<html>` and localStorage persists the preference across reloads

#### Scenario: No hydration flicker
- **WHEN** the page loads with a stored dark mode preference
- **THEN** there is no flash of incorrect theme (suppressHydrationWarning is set)

### Requirement: Theme toggle component available
A `ThemeToggle` component SHALL exist at `apps/web/components/shared/theme-toggle.tsx`. It SHALL use `useTheme()` from `next-themes` and render controls to switch between `light`, `dark`, and `system` themes. It SHALL be a client component (`'use client'`). It SHALL be mounted in the app header (for now; sidebar footer placement is for a later item).

#### Scenario: Toggle switches theme
- **WHEN** the user clicks the dark mode option in the ThemeToggle
- **THEN** `setTheme('dark')` is called and the page switches to dark mode immediately

#### Scenario: Current theme is reflected
- **WHEN** the current theme is `dark`
- **THEN** the dark option is visually active (aria-pressed true or equivalent)

### Requirement: All four fonts configured in fonts.ts
`apps/web/app/fonts.ts` SHALL export all four font configurations: `geistSans` (Geist, `--font-geist-sans`), `geistMono` (Geist_Mono, `--font-geist-mono`), `newsreader` (Newsreader, `--font-newsreader`), `tiroDevanagari` (Tiro_Devanagari_Marathi, `--font-tiro-devanagari`). `apps/web/app/layout.tsx` SHALL import all four from `./fonts` and SHALL NOT inline any font configuration.

#### Scenario: layout.tsx uses fonts.ts exports only
- **WHEN** `apps/web/app/layout.tsx` is read
- **THEN** it contains no inline `Geist(...)` or `Geist_Mono(...)` calls — only imports from `./fonts`

### Requirement: framer-motion installed and catalogued
`framer-motion` SHALL be installed as a dependency in `apps/web/package.json`. `documentation/10_Platform-Engineering-Standard.md` approved library catalog SHALL include a row for `framer-motion` under Animation (already listed as the approved animation library — verify the package name entry is complete).

#### Scenario: framer-motion importable
- **WHEN** a component imports `{ motion } from 'framer-motion'`
- **THEN** it compiles without error

### Requirement: Button component handles loading state
The `Button` component SHALL support a `loading` boolean prop. When `loading` is true, the button SHALL display a spinner (animated) in place of its content and SHALL be disabled (pointer-events-none, reduced opacity). The spinner SHALL be implemented with a Tailwind `animate-spin` border circle — no external spinner library.

#### Scenario: Loading button is disabled and shows spinner
- **WHEN** `<Button loading>Save</Button>` is rendered
- **THEN** the button shows a spinner, is non-interactive, and the text "Save" is not visible

#### Scenario: Button not loading shows normal content
- **WHEN** `<Button loading={false}>Save</Button>` is rendered
- **THEN** the button shows "Save" with no spinner

### Requirement: Input component supports explicit error state via className or aria-invalid
The existing `Input` component already handles `aria-invalid` with `danger`/destructive border. This requirement is satisfied. No changes needed — the component already meets the spec.

#### Scenario: Input with aria-invalid shows error styling
- **WHEN** `<Input aria-invalid="true" />` is rendered
- **THEN** the input has a danger-colored border

### Requirement: Card and Alert components exist with correct states
`apps/web/components/ui/card.tsx` SHALL exist and provide a `Card` component with `CardHeader`, `CardContent`, `CardFooter` sub-components. `apps/web/components/ui/alert.tsx` SHALL exist and provide an `Alert` component with `default` and `destructive` variants. Both SHALL use design token CSS variables for colors.

#### Scenario: Card renders with surface background
- **WHEN** a `<Card>` is rendered
- **THEN** it has background `var(--surface)`, border `var(--border)`, and `shadow-card` elevation

#### Scenario: Alert destructive variant uses danger color
- **WHEN** `<Alert variant="destructive">` is rendered
- **THEN** it uses `var(--danger)` for border and text color
