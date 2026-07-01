# Design System — v1

> **Superseded in part (2026-06-11):** shell/nav, component language, motion, and screen
> layouts are now defined in `analysis-output/DESIGN-LANGUAGE.md` (the H-Hybrid direction
> from the design discussion; prototypes in `analysis-output/design-prototypes/`). This
> file remains the reference for the foundational tokens below. Where the two differ,
> DESIGN-LANGUAGE.md wins. The project uses **Tailwind v4 (CSS-first `@theme inline` in
> `globals.css`)** — there is no `tailwind.config.ts`. Radius scale is now soft & airy
> (sm 8 / md 12 / lg 16 / xl 22). **Signal colors corrected:** `danger` is now distinct
> from `accent` (striking red), `warning` is a clearer golden amber — values below reflect this.

## Color Tokens

### Light Mode
```css
:root {
  --bg: #FAF7F2;
  --fg: #1C1A17;
  --accent: #C0512F;
  --accent-hover: #a8431f;
  --accent-2: #2F5B4F;
  --muted: #8A817A;
  --surface: #FFFFFF;
  --border: rgba(47, 91, 79, 0.12);
  --border-strong: rgba(28, 26, 23, 0.16);
  --success: #3D8B37;
  --warning: #CA8A04;
  --danger: #B5261C;
}
```

### Dark Mode
```css
.dark {
  --bg: #1A1816;
  --fg: #F5F0EA;
  --accent: #D4694A;
  --accent-hover: #B85A3C;
  --accent-2: #4A8A7A;
  --muted: #7A7570;
  --surface: #242220;
  --border: rgba(200, 190, 180, 0.12);
  --border-strong: rgba(200, 190, 180, 0.20);
  --success: #4CA644;
  --warning: #E0A722;
  --danger: #E5594C;
}
```

Dark mode: same hue family as light, inverted. Warm, not cold/blue-black.

### Theme Toggle
- Default: follows system preference (`prefers-color-scheme`)
- Manual override: persists in localStorage + DB user preference
- Toggle accessible from: settings page, sidebar footer

---

## Typography

### Font Families

| Role | Font | CSS variable | Usage |
|---|---|---|---|
| Sans | Geist Sans | `--font-sans` | Body text, UI labels, buttons |
| Mono | Geist Mono | `--font-mono` | Stats, counts, IDs |
| Display | Newsreader | `--font-display` | Headings (h1, h2), hero text, page titles |
| Devanagari | Tiro Devanagari | `--font-deva` | All Devanagari content |

### Scale

> **The exact, enforceable scale (with Tailwind classes) and the rules for using it live in `15a_UI-Consistency-Rules.md` §1–2.** That doc is canonical for *what to type*; this table is the conceptual overview. Where they ever differ, 15a wins. Note headings are **`font-normal` (400)** — the serif carries emphasis, not weight (see 15a §2).

| Level | Size | Weight | Line height | Font | Usage |
|---|---|---|---|---|---|
| page title | `clamp(26px,3vw,36px)` | 400 | 1.2 | display | The one `<h1>` per page (responsive) |
| h2 | 20px | 400 | 1.4 | display | Section headings |
| h3 | 16px | 500 | 1.5 | sans | Card / sub-section titles |
| eyebrow | 11px | 400 | 1.4 | mono | Uppercase `tracking-[0.12em]` section labels |
| body | 14px | 400 | 1.6 | sans | Default text |
| small | 13px | 400 | 1.5 | sans | Supporting copy, list subtitles |
| caption | 12px | 400 | 1.5 | sans | Captions, metadata, timestamps |
| mono | 12px–30px | 500 | 1.4 | mono | Stats, counts, IDs |

### Devanagari
- Follows the same scale but rendered 10-15% larger for equivalent visual weight
- Applied via `font-deva` Tailwind class
- Never mixed in the same `<span>` with Latin — always a separate element so sizing can differ

---

## Spacing

4px base grid. Standard Tailwind spacing scale: `1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)`.

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, small tags |
| `--radius-md` | 8px | Cards, inputs, buttons |
| `--radius-lg` | 12px | Modals, panels |
| `--radius-full` | 9999px | Avatars, pills |

---

## Elevation / Shadow

| Level | Light mode | Dark mode | Usage |
|---|---|---|---|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.06)` | `0 1px 3px rgba(0,0,0,0.20)` | Cards, list items |
| `--shadow-modal` | `0 8px 32px rgba(0,0,0,0.12)` | `0 8px 32px rgba(0,0,0,0.30)` | Modals, dropdowns |
| `--shadow-toast` | `0 4px 16px rgba(0,0,0,0.10)` | `0 4px 16px rgba(0,0,0,0.25)` | Toasts, notifications |

---

## Animation Timing

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `--anim-micro` | 150ms | ease-out | Button press, icon state change |
| `--anim-transition` | 250ms | ease-out | Tab switch, card expand |
| `--anim-page` | 400ms | ease-in-out | Page transition, modal open/close |

Library: Framer Motion. Never animate for decoration — only when it communicates meaning.

---

## Component States

All interactive components (button, input, textarea, select, card, badge, toggle) must handle:

| State | Treatment |
|---|---|
| Default | Base styling |
| Hover | Subtle background shift (not border change) |
| Active / Pressed | Slight scale-down (0.98) + deeper background |
| Focused | `accent-2` ring (2px offset) for keyboard navigation |
| Disabled | 50% opacity + `cursor-not-allowed` |
| Error | `--danger` border + error text below |
| Loading | Spinner replacing action text (button) or shimmer (card/list) |

---

## Bilingual Content Rendering

> **Revised 2026-06-30** — content rendering is **toggle-ordered**, not fixed Devanagari-first. See `spec/decisions/20_design-philosophy.md` §8. Use the shared components below rather than hand-rolling `mr ?? en` or conditional `font-deva`.

### Components
- **`BilingualText`** (`components/shared/bilingual-text.tsx`) — stacked two-line content (card primary sentence, page headings). Shows **both** scripts, ordered by the active locale: selected language is the primary line (foreground, larger), the other is the muted secondary line below. Falls back to a single line when only one script exists.
- **`ContentText`** — single-language content for **compact contexts** (chips, metadata rows, breadcrumbs). Shows only the active-locale value (falling back to the other script when missing); applies `font-deva` automatically for Devanagari.

### Layout: stacked (primary approach, via `BilingualText`)
- Active-locale line above (primary), other script below (secondary)
- Devanagari (whichever role): `font-deva`
- Secondary line: `--muted` color, smaller
- Clear vertical rhythm between the two scripts

### When side-by-side is needed (shlokas, long content)
- Two-column layout on desktop (Devanagari left, English right)
- Collapses to stacked on mobile

### Inline mixed content
- Devanagari inline within English text: wrap in `<span class="font-deva">` — inherits size from context
- Never use different font sizes for inline mixing

---

## Icons

- Library: lucide-react
- Default state: lined (unfilled), 20px
- Active/selected state: filled variant of same icon
- Consistency: one style per context — never mix lined and filled in the same nav/toolbar
- Sidebar nav icons: 20px
- Card/inline icons: 16px
- Hero/empty state icons: 24px

---

## shadcn Component Token Aliases

shadcn components (Calendar, Popover) use their own CSS variable names. These are mapped to our design tokens in `globals.css` so shadcn components automatically inherit the correct colours:

| shadcn token | Our token | Notes |
|---|---|---|
| `--background` / `bg-background` | `--bg` | Page background |
| `--foreground` / `text-foreground` | `--fg` | Primary text |
| `--popover` / `bg-popover` | `--surface` | Popup/dropdown background |
| `--popover-foreground` | `--fg` | Popup text |
| `--primary` / `bg-primary` | `--accent` | Selected day, active states |
| `--primary-foreground` | `#FAF7F2` | Text on accent background |
| `--muted-foreground` | `--muted` | Subdued text (weekday labels, outside days) |
| `--ring` | `--accent` | Focus ring |

Do not add new shadcn token aliases without updating this table and `globals.css`.
