# Design System & Design Language — v1

**The single source of truth for Veervrat's UI/UX.**

> Merged 2026-08-16 from the former `analysis-output/DESIGN-LANGUAGE.md` (design discussion,
> 2026-06-11) and this file. They previously overlapped on colour and **contradicted each
> other on radius**, with a note saying one "wins" over the other — the reconciliation that
> doc's own §9 asked for, finally done. The design-language file also lived outside the repo,
> untracked, while being declared canonical.
>
> **Companion:** `15a_UI-Consistency-Rules.md` defines *how to apply* these tokens — the exact
> Tailwind classes and the rules against drift. Where the two differ on a class name, **15a
> wins**; this doc owns the tokens and the language, 15a owns execution.

The project uses **Tailwind v4 (CSS-first `@theme inline` in `globals.css`)** — there is no
`tailwind.config.ts`.

---

## 1. Principles

Veervrat is a **calm, reflective daily-practice app** for a broad, non-power-user audience.
The direction is Retro/Threads "at peace, content-first" — not a dense workspace.

1. **Calm & content-first** — generous whitespace, capped reading column, no permanent chrome
   competing with content.
2. **One mental model on every device** — same destinations and IA on mobile/tablet/desktop;
   only the *position* of nav changes (rail ↔ floating pill). Never reorganise IA per platform.
3. **Virtue-first framing** — the virtue being cultivated is the headline; the weakness is the
   diagnostic lens, framed secondarily (spec/15).
4. **Tasteful, expressive motion** — subtle by default, a few intentional expressive moments.
   Always respects `prefers-reduced-motion`.
5. **Soft & airy** — larger radii, gentle shadows, breathable padding, comfortable targets.

---

## 2. Shell & navigation — "H-Hybrid: calm spine, adaptive"

### Desktop / tablet (≥768px)
- **Left rail** (~240px): logo + grouped nav — *Practice* (Dashboard, Study, Journeys) ·
  *Guidance* (Actions, My Vratmitras). Active item = accent tint + left accent bar. Theme and
  language toggles live in the **rail footer** beside the user chip.
- **Top bar** (~60px): breadcrumb left · notification bell + avatar right. No stray controls.
- **Content**: centred, capped reading column (~760px). **No right sidebar.**

### Mobile (<768px)
- Rail dissolves into a **floating pill nav**: centred, bottom, backdrop-blur, rounded-full.
  The active item is accent-filled and expands to show its label inline; others are icons.
  Carries badges (e.g. Actions count).
- Top bar: logo + brand left · bell + avatar right. Content full-width, cards single-column.

### Deep hierarchy
Use **in-content tabs** (e.g. journey interior: Status Overview · Exposures · Resolutions ·
Challenges · Chat). **Never a third column.** Tabs are sticky, horizontally scrollable on
mobile, active = accent text + underline.

### Deliberately removed
- **Persistent right sidebar** — held landing-page content not in the dashboard spec.
- **Platform stats in-app** — landing-page social proof; lives only on the public landing page.
- **Shloka of the day** → became a dashboard content card ("A thought for today") linking to Pothi.

---

## 3. Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF7F2` | `#1A1816` | app background |
| `surface` | `#FFFFFF` | `#242220` | cards, inputs |
| `secondary` | `#F0EAE0` | `#2E2B28` | secondary buttons, sunken fills |
| `fg` | `#1C1A17` | `#F5F0EA` | text |
| `muted` | `#8A817A` | `#7A7570` | secondary text, labels |
| `border` | `rgba(47,91,79,.12)` | `rgba(200,190,180,.12)` | hairlines |
| `border-strong` | `rgba(28,26,23,.16)` | `rgba(200,190,180,.20)` | input borders |
| **`accent`** (terracotta) | `#C0512F` | `#D4694A` | primary actions, brand, active nav |
| `accent-hover` | `#a8431f` | `#B85A3C` | hover on accent |
| `accent-2` (pine) | `#2F5B4F` | `#4A8A7A` | virtue framing, secondary accent |
| **`success`** | `#3D8B37` | `#4CA644` | approved, available |
| **`warning`** | `#CA8A04` | `#E0A722` | pending / caution |
| **`danger`** | `#B5261C` | `#E5594C` | destructive, errors |

> **The four signals must stay separable.** An earlier `globals.css` had `danger` equal to
> `accent` and a muddy `warning`, which made status colours indistinguishable. Danger is a
> distinct striking red; warning a clear golden amber — both still warm-palette-native.

Dark mode is the same hue family, inverted — warm, never cold blue-black.

**Theme toggle:** follows `prefers-color-scheme` by default; manual override persists in
localStorage + a DB user preference. Reachable from settings and the rail footer.

---

## 4. Radius, elevation, spacing

### Radius — soft & airy
`sm 8 · md 12 · lg 16 · xl 22 · full 9999`

Cards = `lg` (16) · buttons = `md` (12) · pills and badges = `full` · modals = `xl` (22).

### Elevation
| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.06)` | `0 1px 3px rgba(0,0,0,0.20)` | resting cards |
| `--shadow-raised` | 6–24px, low opacity | warmer, higher opacity | hover / float |
| `--shadow-modal` | `0 8px 32px rgba(0,0,0,0.12)` | `0 8px 32px rgba(0,0,0,0.30)` | overlays |
| `--shadow-toast` | `0 4px 16px rgba(0,0,0,0.10)` | `0 4px 16px rgba(0,0,0,0.25)` | toasts |

Elevation is a **scarce signal** — see `15a` §4 for the hard rules on when it is permitted.

### Spacing
4px base grid. Card padding ~20–22px, section gaps ~28–36px, touch targets ≥36px, content
column capped ~760px.

---

## 5. Typography

| Role | Font | CSS variable | Usage |
|---|---|---|---|
| Display | **Newsreader** (serif) | `--font-display` | headings, page titles — the app's warmth |
| Sans | **Geist Sans** | `--font-sans` | body, UI labels, buttons |
| Mono | **Geist Mono** | `--font-mono` | stats, counts, eyebrows, IDs |
| Devanagari | **Tiro Devanagari Marathi** | `--font-deva` | all Devanagari — never substitute |

| Level | Size | Weight | Line height | Font |
|---|---|---|---|---|
| page title | `clamp(26px,3vw,36px)` | 400 | 1.2 | display |
| h2 | 20px | 400 | 1.4 | display |
| h3 | 16px | 500 | 1.5 | sans |
| eyebrow | 11px | 400 | 1.4 | mono, uppercase `tracking-[0.12em]` |
| body | 14px | 400 | 1.6 | sans |
| small | 13px | 400 | 1.5 | sans |
| caption | 12px | 400 | 1.5 | sans |
| stat / mono | 12–30px | 500 | 1.4 | mono |

**Headings are `font-normal` (400)** — the serif carries the emphasis. Bolding it is the
single biggest "AI-generated heading" tell. See `15a` §2.

**Devanagari** renders 10–15% larger for equivalent visual weight, via `font-deva`. Never mix
scripts inside one `<span>` — always separate elements so sizing can differ. Dates are
locale-aware (`mr-IN` / `en-IN`).

---

## 6. Component language

All components support the seven states in §7 where applicable.

- **Buttons** — `primary` (accent) · `secondary` (secondary fill) · `outline` · `ghost` ·
  `destructive` (danger). Sizes sm/md/lg. Press = gentle scale-down, spring
  `cubic-bezier(.34,1.56,.64,1)`. Focus = 3px accent ring. Loading = inline spinner.
- **Inputs** — label (mono) + control + hint/error. Airy padding ~11–14px. Focus = accent
  border + soft ring. Error = danger border + ring + message. Checkbox is a rounded square
  (accent when on), radio an accent dot.
- **Cards** — `plain` · `interactive` (hover-lift + spring, press-dip) · `elevated`. Radius `lg`.
  ⚠️ Interactive cards **must set `color: var(--fg)`** — otherwise an `<a>`-wrapped card
  inherits link-blue. This was a real bug, not a hypothetical.
- **Badges / tags** — status (ERC + journey: not-started / in-progress / submitted / approved /
  revisit, each tinted from its signal colour) · tier (Local/National/International outline
  pills) · **virtue-first tag** (accent-2 pill with dot, e.g. "Courage → Initiative") ·
  count badge (accent, mono).
- **Tabs** — in-content sub-nav; active = accent text + underline; counts inline.
- **Empty states** — icon in a tinted circle + display heading + muted explanation + CTA.
  Never a dead end.
- **Overlays** — modal (spring scale-in, radius `xl`) → **bottom sheet on mobile**; toast
  (fg-on-bg pill, slides up, auto-dismiss); confirm dialogs.
- **Misc** — avatars (accent-2 initials), dividers, skeleton shimmer, page loader, streak chip
  (🔥 + warning tint).

---

## 7. Component states

Every interactive component handles all seven:

| State | Treatment |
|---|---|
| Default | Base styling |
| Hover | Subtle background shift (not a border change) |
| Active / pressed | Scale-down 0.96–0.98 + deeper background |
| Focused | Accent ring (3px) — keyboard navigation must be visible |
| Disabled | 50% opacity + `cursor-not-allowed` |
| Error | `--danger` border + error text below |
| Loading | Spinner replacing action text, or shimmer for cards/lists |

---

## 8. Motion & micro-interactions

**Tasteful and calm, with expressive touches.** Always gated on
`@media (prefers-reduced-motion: reduce)`.

| Token | Duration | Easing | Usage |
|---|---|---|---|
| fast | 140ms | ease-out | hover, press |
| base | 220ms | ease-out | transitions, tab switch |
| spring | — | `cubic-bezier(.34,1.56,.64,1)` | tactile moments |
| page | 400ms | ease-in-out | route / modal transitions |

- **Press feedback:** scale-down `.96` on `:active` for buttons, nav items, cards
- **Card hover:** lift `translateY(-4px)` + raised shadow (spring)
- **Nav:** rail active bar; mobile pill active item expands its label (spring max-width)
- **Animated counters:** stat numbers count up on dashboard load
- **Celebratory peaks:** test submit → progressive report reveal; journey completion → a peak
  moment. Tasteful, not confetti

Library: Framer Motion. **Never animate for decoration** — only when it communicates meaning.

---

## 9. Key screen layouts

- **Dashboard** — virtue-first stat bar (3 virtues headline + secondary stats), two path cards
  with mini-stats, suggestion list (score chip 1=danger / 2=warning + virtue-first context +
  Start journey), "A thought for today" shloka card.
- **Journey interior** — header (title · virtue-first "Cultivating X → Y" tag · Active badge ·
  VM context · Pause + Submit for completion), in-content tabs, Status Overview (3 progress
  cards + recent-activity feed), ERC cards (tier + status + actions), VM sidenote panel with
  acknowledge, inline check-in (Done/Partial/Missed + streak), pool to add items, "Add custom".
- **Actions** — guidance inbox: filter chips (All / Needs response / Suggestions / Updates),
  grouped (Needs your response / Earlier), type-coded items with per-type actions, unread dots.

All responsive (desktop rail + mobile pill) and dark-mode verified.

> The HTML prototypes these were designed against (`analysis-output/design-prototypes/`) were
> deleted 2026-08-16 — the shipped app is now the visual reference, and 3.4MB of mockups of an
> already-implemented design was stale weight.

---

## 10. Bilingual content rendering

> Content rendering is **toggle-ordered**, not fixed Devanagari-first (spec/decisions/
> 20_design-philosophy.md §8). Use the shared components — never hand-roll `mr ?? en` or a
> conditional `font-deva`.

- **`BilingualText`** (`components/shared/bilingual-text.tsx`) — stacked two-line content.
  Shows **both** scripts, ordered by active locale: selected language primary (foreground,
  larger), the other muted below. Falls back to one line when only one script exists.
- **`ContentText`** — single-language, for **compact contexts** (chips, metadata, breadcrumbs).
  Shows the active-locale value, falling back to the other script; applies `font-deva`
  automatically.

**Side-by-side** (shlokas, long content): two columns on desktop (Devanagari left, English
right), collapsing to stacked on mobile. **Inline mixing:** wrap Devanagari in
`<span class="font-deva">` — it inherits size from context; never change size inline.

---

## 11. Icons

**lucide-react only** — no second icon set, no hand-rolled SVG glyphs.

- Default lined (unfilled), active/selected = filled variant of the same icon
- One style per context — never mix lined and filled in the same nav or toolbar
- Sizes: nav 20px · card/inline 16px · hero/empty-state 24px
- Decorative icons get `aria-hidden`; meaning-carrying icons get an `aria-label` or paired
  sr-only text

---

## 12. shadcn component token aliases

shadcn components (Calendar, Popover) use their own CSS variable names, mapped to our tokens
in `globals.css` so they inherit the right colours automatically:

| shadcn token | Our token | Notes |
|---|---|---|
| `--background` | `--bg` | page background |
| `--foreground` | `--fg` | primary text |
| `--popover` | `--surface` | popup / dropdown background |
| `--popover-foreground` | `--fg` | popup text |
| `--primary` | `--accent` | selected day, active states |
| `--primary-foreground` | `#FAF7F2` | text on accent |
| `--muted-foreground` | `--muted` | subdued text |
| `--ring` | `--accent` | focus ring |

Do not add a new alias without updating this table **and** `globals.css`.
