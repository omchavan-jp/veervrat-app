# Design Philosophy & UX Principles
_Last updated: 2026-06-02 | Round: R1_

## Source
Derived from three design video transcripts ("How I Make Apps FEEL 10x Better", "How I Design Apps 10x Better", "The Tiny Design Rule Behind Top 1% Apps") and applied to Veervrat's specific context.

---

## Confirmed Decisions

### 1. Peak & End Rule (most critical)
Users remember two moments: the **peak** (most intense/meaningful) and the **end** (last moment of a session/flow). Everything else is noise.

**Veervrat peaks to design deliberately:**
- **Test report reveal** — the moment after test submission where the VA sees their results for the first time. This is the primary aha moment. Animate it. Make it feel like a revelation, not a page load.
- **Journey completion** — the end of a multi-week/month effort. Give it weight: a crafted completion screen, a reflection prompt, a celebratory but measured moment (consistent with the app's serious/purposeful tone).
- **First time taking the Vrat** (onboarding framework section) — a solemn, meaningful moment. Design it with the gravity of a commitment.

**Ends to design deliberately:**
- Session ending on the dashboard — gentle closing state, not abrupt.
- ERC item approved — confirmation that feels earned, not just a status change.
- Custom ERC submitted for review — closure prompt, "it's in good hands."

### 2. Micro-animations & Interactions
- Tab/section transitions: slide/ease, not instant snap.
- State changes (ERC status, journey state, test submission): animate the transition.
- Accumulate across 100+ interactions — premium feel is the sum of small things.
- Never animate for decoration — only when it communicates meaning (loading, transition, completion, error).

### 3. Empty States
- Never blank. Every zero-state gets intentional design.
- Dashboard with no test taken: strong contextual nudge — not just a button, a framed invitation.
- Guidance page with no pending items: positive reinforcement ("All clear — you're on top of it").
- Chat with no messages: warm contextual prompt to start a conversation.
- Custom illustrations or thoughtful copy — TBD in design phase.

### 4. Icon Consistency
- One icon style throughout. Lined (unfilled) for default state. Filled for active/selected state.
- No mixing of styles within the same context.
- Icon set: lucide-react (already in tech stack) — consistent, well-documented, suitable.
- Active state: filled variant of same icon, not just color change.

### 5. Contextual Suggestions / Chips
- Don't leave users at blank prompts. Where a user might not know what to do, surface 2-3 contextual quick-action chips.
- Applies to: Guidance page (suggested next actions), Chat (first-open conversation starters), test selection (weakness suggestions based on prior results).

### 6. Peak Placement
- Peak first, wind down to a good end. Don't save the magic for the very last moment.
- Test: reveal the report dramatically → then gently offer to start a journey.
- Journey completion: celebrate → then gently suggest the next step.

### 7. Navigation & Orientation (user always knows where they are)
- **Breadcrumbs or contextual back links** on all inner pages — never a dead end.
- **Active state in nav** always reflects current location accurately.
- **Browser back button behaviour**: must navigate logically within the app, not to the previous external site. Use Next.js `router.push` with history correctly — never lose in-app context.
- **Depth indicator**: when inside a nested view (e.g. journey → exposure detail), show the path clearly.
- Every page has a clear "how did I get here" and "where can I go from here."
- Direct URL access (typing a URL or sharing a link) must always land on a coherent page, not a broken or context-less state.

### 8. Language Control
Language affects every layer of the app. Known cases that need handling:
- **UI language vs content language**: UI labels (buttons, nav, headings) in EN or MR based on user preference. Content (sentences, ERC, shlokas) is bilingual — both displayed together, not toggled.
- **Devanagari rendering**: ensure proper font loading and fallbacks for Devanagari across all contexts (modals, cards, chat, PDFs).
- **Mixed-script contexts**: some content naturally mixes EN and MR/Devanagari (e.g. a shloka with an English commentary). Layout must handle bidirectionality gracefully.
- **Language preference persists**: set at onboarding, changeable from settings, applied globally.
- **Third-party content** (resource links, YouTube thumbnails, OG titles): may be in any language — display as-is, no forced translation.
- **Search**: must work in both EN and Devanagari for entities that have both.
- **Dates**: Gregorian in EN/MR based on UI language; Saka date always shown in Devanagari numerals.
- **Notifications and emails**: sent in user's preferred language where possible.

## Open Questions (area-specific)
- Illustration/mascot for empty states — does Veervrat want a custom character, or use symbolic imagery (lotus, diya, etc.) consistent with the cultural identity? TBD in design phase.
- Animation library: **Framer Motion** — confirmed for Next.js frontend.
- Specific peak animation for test report reveal — format TBD in design phase.

## Flags
- ⚠ Browser back button must work logically within the app — requires careful Next.js routing setup from the start, not a retrofit.
- ⚠ Language preference must be applied at the layout/provider level, not component-by-component — architecture decision to make early.
- ⚠ Devanagari font loading must be treated as a first-class concern, not an afterthought — affects perceived quality on every screen.
