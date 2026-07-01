# UI Consistency Rules

> Companion to `15_Design-System.md`. That doc defines the **tokens** (color, type scale, spacing, shadows). This doc defines the **rules for using them** — the thing that was missing and the reason the app reads "vibecoded" despite each element being individually fine.
>
> **The core problem this fixes:** every screen was built component-by-component, each locally reasonable, nothing enforcing the whole. The result is a hundred 5%-off decisions — page titles rendered at 26/28/30px and three different `clamp()` formulas, body text scattered across 11–15px, elevation applied at random. Incoherence, not ugliness.
>
> **The discipline:** when building or editing any screen, every type size, weight, spacing value, and surface choice must map to a rule below. If it doesn't, either the rule is wrong (fix the rule, once) or the screen is wrong (fix the screen). No third option, no per-screen improvisation.

---

## 1. Type scale — ONE size per role

The design-system scale is canonical, restated here in the exact Tailwind form to use. **Do not invent intermediate sizes.** The audit found page titles at `30px`, `26px`, `28px`, `text-[clamp(28px,3vw,40px)]`, `text-[clamp(26px,3vw,38px)]`, and `text-[clamp(28px,3vw,36px)]` — all meaning "page title." That is the drift. One answer each:

| Role | Class | Font | Weight | Notes |
|---|---|---|---|---|
| **Page title** (one per page, the `<h1>`) | `text-[clamp(26px,3vw,36px)]` | `font-display` | `font-normal` | Responsive. This is the *only* page-title size. |
| **Section heading** (`<h2>`) | `text-[20px]` | `font-display` | `font-normal` | |
| **Card / sub-section title** (`<h3>`) | `text-[16px]` | `font-sans` | `font-medium` | |
| **Eyebrow / section label** | `text-[11px] uppercase tracking-[0.12em]` | `font-mono` | `font-normal` | The recurring `text-muted` kicker above sections. Keep `0.12em` (not 0.1/0.14 — those are drift). |
| **Body** | `text-[14px]` | `font-sans` | `font-normal` | Default. `leading-relaxed` for paragraphs. |
| **Body small / secondary** | `text-[13px]` | `font-sans` | `font-normal` | Supporting copy, list subtitles. |
| **Caption / metadata** | `text-[12px]` | `font-sans` | `font-normal` | Timestamps, counts-in-context, helper text. |
| **Micro** | `text-[11px]` | `font-sans` / `font-mono` | `font-normal` | Chips, badges. Smallest allowed. |
| **Stat number** | `text-[20px]`–`text-[30px]` | `font-mono` | `font-medium` | Size by prominence; mono always. |

**Hard rules:**
- `text-[10px]` and `text-[9px]` are **banned** for anything a user must read (the audit found 44 uses). Sub-11px is sub-legible. Exceptions: a deliberate super-script badge count, never body/labels.
- `text-[15px]`, `text-[17px]`, `text-[18px]`, `text-[21px]`, `text-[22px]`, `text-[26px]`, `text-[28px]`, `text-[30px]`, `text-[32px]` as **page titles** are drift → collapse to the page-title clamp above. (These sizes are fine *inside* the table's defined roles; they are not fine as ad-hoc one-offs.)
- Bilingual content is exempt from this table — it goes through `BilingualText`/`ContentText`, which own their own (toggle-ordered) scale.

## 2. Font-weight hierarchy — three weights, that's it

The audit found weight is *almost* disciplined already (`font-medium` ×148, `font-semibold` ×16, `font-normal` ×8) — but the rule was never written, so `semibold` leaks in. Pin it:

- **`font-normal` (400)** — body, captions, page titles, section headings. **Display/serif headings are normal weight** (the serif carries the emphasis; bolding it makes it shouty and is the #1 "AI heading" tell).
- **`font-medium` (500)** — the only emphasis weight. Card titles, active nav, buttons, selected states, stat numbers.
- **`font-semibold` (600)** — reserved for a genuine single focal point (a hero number, one primary CTA label). If more than ~one per screen, you're overusing it.
- **`font-bold`+ — banned.** Not in the palette.

Emphasis comes from **size, color, and weight-500 — not from bold.** This is the single biggest lever on "looks calm vs. looks vibecoded."

## 3. Spacing rhythm — a vertical scale, not a free-for-all

4px grid (per design-system). For **vertical rhythm between blocks**, use this ladder and nothing between:

- **`gap`/`mb-2` (8px)** — within a tight cluster (label → value, title → subtitle).
- **`mb-3` (12px)** — between rows in a list.
- **`mb-6` (24px)** — between a heading and its content.
- **`mb-8`–`mb-10` (32–40px)** — between major sections.
- **`mb-12` (48px)** — between zones of different purpose.

**Rule:** the gap between two things should be **proportional to how unrelated they are.** Uniform spacing (everything `mb-4`) is a primary cause of the "flat, reads in no order" feeling. Bigger gaps = stronger grouping signal. Don't use `mb-5`/`mb-7` (off-ladder).

## 4. Elevation & surface — earn it, don't default to it

We are a **calm, minimal system** (Retro/Threads north-star). Elevation is a scarce signal, not a default. The audit's finding "everything is a thin-bordered card on one flat plane" is the disease; the cure is **using fewer surfaces, more deliberately** — *not* adding three competing drop-shadows everywhere.

Permitted surfaces, in order of weight:

1. **Page background (`bg-bg`)** — the default plane. Most content sits directly on it.
2. **Hairline group (`border border-border`, no shadow)** — the default way to group: a thin border, no elevation. This is the workhorse; use it for most cards and list containers.
3. **Raised surface (`bg-surface shadow-card`)** — for content that should feel lifted: the ONE hero/primary block on a screen, popovers, the active item. Sparingly.
4. **`shadow-raised` / `shadow-modal`** — floating UI only (dropdowns, dialogs, the mobile pill nav, toasts). **Never** on in-page content cards.

**Hard rules:**
- A screen has **at most one `shadow-card` hero region** competing for attention. If two regions are both raised, neither wins.
- Don't combine a heavy border *and* a shadow on the same element — pick one grouping signal.
- "Make it a card" is not a layout decision. Most things that are currently cards should be hairline groups or just spacing.

## 5. Density by zone — vary it on purpose

Uniform density is the other half of "reads flat." A screen should have **deliberately different densities**:

- **Status / metadata zones** → **dense.** One compact row, small type, tight spacing. Information, not focus.
- **Hero / "act now" zone** → **spacious.** Generous padding, larger type, the raised surface. This is where the eye should land.
- **Lists / browse zones** → **dense and scannable.** Tight rows, one line each, inline actions. Not full-width banners.

If every zone has the same padding and type size, the page has no focal point — restructure before restyling.

## 6. Actions sit beside their content

No button flung to the far edge with a canyon of empty space between it and what it acts on (the audit's "orphaned actions"). Primary action inline with, or immediately below, its content. A large horizontal gap between content and its button reads as "loose/stretched" — that's the feeling, named.

## 7. Icons

(Reinforces design-system §Icons.) **lucide-react only.** No hand-rolled SVG glyphs, no second icon set. Decorative icons get `aria-hidden`; meaning-carrying icons get an `aria-label` or paired sr-only text. One visual style per toolbar/nav (don't mix lined and filled).

---

## How to use this doc

- **Building/editing a screen:** every type/weight/spacing/surface choice maps to a rule here. The IA-restructure method (priority 1–3 + one-sentence job + permitted weight per block) decides *layout*; this doc decides *execution*.
- **Reviewing a screen:** the fastest "is this vibecoded?" check —
  1. Count page-title sizes: must be exactly one.
  2. Count raised/shadowed regions: should be ≤1.
  3. Is spacing uniform everywhere? If yes, hierarchy is missing.
  4. Any `font-bold` or `font-semibold` sprinkled? If more than one focal point, it's overused.
  5. Any sub-11px readable text? Banned.
- **The cure is removal and re-weighting, not addition.** If a fix involves adding a component, library, or surface, stop — that's how the app got here.
