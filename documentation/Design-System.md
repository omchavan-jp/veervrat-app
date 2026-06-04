# Design System — v1

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
  --warning: #C4841D;
  --danger: #C0512F;
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
  --warning: #D4943A;
  --danger: #D4694A;
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

| Level | Size | Weight | Line height | Font | Usage |
|---|---|---|---|---|---|
| display | 32px | 500 | 1.2 | display | Hero headings, page titles |
| h1 | 24px | 600 | 1.3 | display | Section headings |
| h2 | 20px | 600 | 1.4 | display | Sub-section headings |
| h3 | 16px | 600 | 1.5 | sans | Card titles |
| h4 | 14px | 600 | 1.5 | sans | Small section labels |
| body | 14px | 400 | 1.6 | sans | Default text |
| small | 12px | 400 | 1.5 | sans | Captions, metadata |
| mono | 12px | 400 | 1.4 | mono | Stats, IDs |

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

### Layout: stacked (primary approach)
- Devanagari text above, English below
- Devanagari: `font-deva`, slightly larger, `--fg` color
- English: `font-sans`, `--muted` color
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
