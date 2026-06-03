## 1. Dependencies + Library Catalog

- [x] 1.1 Add `next-themes` to `documentation/Platform-Engineering-Standard.md` approved library catalog (hard rule: catalog first, install second)
- [x] 1.2 Install `next-themes` in `apps/web` (`pnpm add next-themes`)
- [x] 1.3 Install `framer-motion` in `apps/web` (`pnpm add framer-motion`)

## 2. CSS Design Tokens

- [x] 2.1 Add `--success`, `--warning`, `--danger` to `:root` in `globals.css` (light mode values from Design-System.md)
- [x] 2.2 Add `.dark {}` block to `globals.css` with all color token overrides (dark mode values from Design-System.md)
- [x] 2.3 Add `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` to `:root` in `globals.css`
- [x] 2.4 Add `--shadow-card`, `--shadow-modal`, `--shadow-toast` to `:root` (light values) and `.dark {}` (dark values) in `globals.css`
- [x] 2.5 Add `--anim-micro`, `--anim-transition`, `--anim-page` to `:root` in `globals.css`
- [x] 2.6 Extend `@theme inline` block to map all new tokens (success, warning, danger, radius-*, shadow-*, anim-*)

## 3. Font Consolidation

- [x] 3.1 Add `geistSans` and `geistMono` exports to `apps/web/app/fonts.ts` (move from inline in `layout.tsx`)
- [x] 3.2 Update `apps/web/app/layout.tsx` to import all four fonts from `./fonts` and remove inline `Geist`/`Geist_Mono` calls
- [x] 3.3 Add `suppressHydrationWarning` to `<html>` element in `layout.tsx` (required for next-themes)

## 4. Dark Mode Provider + Toggle

- [x] 4.1 Wrap `apps/web/lib/providers.tsx` with `ThemeProvider` from `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`)
- [x] 4.2 Create `apps/web/components/shared/theme-toggle.tsx` — client component using `useTheme()`, renders Light/Dark/System options with `aria-pressed` active state
- [x] 4.3 Add `ThemeToggle` to `apps/web/components/layout/header.tsx` (next to `LanguageToggle`)

## 5. Component State Updates

- [x] 5.1 Add `loading` prop to `Button` in `apps/web/components/ui/button.tsx` — shows `animate-spin` spinner, disables button, hides content text
- [x] 5.2 Verify `Card` component exists at `apps/web/components/ui/card.tsx` — create if missing with `Card`, `CardHeader`, `CardContent`, `CardFooter` using design token variables (`--surface`, `--border`, `shadow-card`)
- [x] 5.3 Verify `Alert` component exists at `apps/web/components/ui/alert.tsx` — create if missing with `default` and `destructive` variants using `--danger` token

## 6. Tests

- [x] 6.1 Write unit test for `ThemeToggle`: renders three options, clicking calls `setTheme`, active option has `aria-pressed="true"`
- [x] 6.2 Write unit test for `Button` loading state: loading=true shows spinner and is disabled; loading=false shows children
- [x] 6.3 Run `pnpm test` in `apps/web` — all tests pass
