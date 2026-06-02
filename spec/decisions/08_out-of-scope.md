# Out of Scope
_Last updated: 2026-05-31 | Round: R1_

## Out of Scope for v1

- **Mobile app** (iOS/Android) — web only
- **Payments or subscriptions** — none in v1
- **Group journeys** — one VA per journey only
- **Video/audio in chat** — text, images, and link previews only
- **VA-to-VA interaction** — no peer messaging outside of journeys
- **Offline mode**
- **AI/ML suggestion algorithm** — deferred to a future version. v1 uses lowest-score logic. Architecture must be built for swappability.
- **Multi-instance distributed scheduler lock** — known v1 limitation of `@nestjs/schedule`
- **Kafka, RabbitMQ, SQS, Lambda, Kubernetes, DynamoDB, TensorFlow** — not needed at v1 scale

## In Scope but Unspecced (future rounds needed)

These features are visible in prototypes or have been confirmed as intended — they are **not** out of scope, they just haven't been specced yet:

### Content & Discovery
- **Pothi** — searchable library of shlokas/sacred texts. Sections: Shlokas (142), Stotras, Subhashitas, Upanishads, Bhagavad Gita, Commentaries (coming soon). Filter by source, search, theme tags.
- **Shloka of the day** — rotating carousel in right sidebar. Devanagari + transliteration + English meaning + source citation.
- **Philosophy modal** — "Why we study shlokas" — prose with drop cap, pull quotes, Devanagari lines.
- **Shloka detail modal** — two-column: full text left, contextual notes right ("Connects to" weakness tags).
- **Moderator display content management** — shlokas, screen sections, curated community content (detail TBD)

### Community & Public Features
- **Community blogs** — user-written reflections surfaced in left sidebar ("From the community"). Author avatar, title, one-line description.
- **Public experiences** — testimonial-style cards in right sidebar carousel. Quote + author + location/timeframe.
- **Public VA profile** — what's visible on a VA's public profile (journey completions, stats, etc.) — detail TBD.
- **Guest / anonymous access** — view-only access to Pothi, public blogs, public experiences, weakness browse, public profiles. Soft prompt to sign up/login for any action.

### Logging & Stats
- **Global experience logging** — VA logs an experience not tied to a specific journey. Has visibility controls (Only me / Friends / Public). Linked to a weakness (optional). Distinct from journey-level experience log.
- **Platform stats (public)** — live counts in right sidebar: Vratarthis, Vratmitras, Tests solved, Practice-days completed. Visible to guests.
- **VA stats** — personal stats bar: weaknesses explored, tests taken, journeys active, journeys completed.
- **Dashboard path cards** — Study path stats (weaknesses prioritised, tests in progress/completed) and Work path stats (ongoing resolutions, exposures, journeys active/completed).

### Navigation & Information Architecture
- **What is Veervrat page** — three tabs: What is Veervrat, Process Chart, Core Philosophy. Philosophy grid (4 tiles), pull quotes, Devanagari lines.
- **Process chart / 4-stage growth model** — Recognition → Study → Practice → Integration. Visualised with stage labels, Devanagari, descriptions, bullet details.
- **Saka calendar display** — Rashtriya Saur calendar date alongside Gregorian on dashboard.

### User Flows
- **Onboarding flow** — first-run experience. Profile creation (name, username, email, language preference, gender optional, DoB optional). No mobile or WhatsApp fields (dropped). "Our stance" card (autonomy emphasis). Full spec in `decisions/12_onboarding.md`.
- **User search** — finding users by name/username for VM invitation.
- **VA public profile** — what a guest or another user sees on a VA's public page.

### Deferred Decisions
- **Vratmitra credibility/verification mechanism** — must resolve before v1 ships
- **`admin.view_chat`** — admin access to VA-VM chat (TBD)
- **Chat media limits** — file size, types, retention policy (TBD)
- **Deployment details** — staging setup, managed vs. self-hosted infra choices
