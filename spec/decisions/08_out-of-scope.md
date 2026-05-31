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

- **Pothi** — searchable library of shlokas and sacred texts, categorised and tagged to weaknesses/themes
- **Community blogs and public experiences** — user-written reflections surfaced publicly
- **Global experience logging** — a VA logging experiences not tied to a specific journey
- **Guest / anonymous access** — view-only access to public content (blogs, shlokas, pothi, public experiences) without auth
- **Onboarding flow** — first-run experience for new users
- **User search** — finding users by name/username for VM invitation
- **Process chart / 4-stage growth model** — Recognition → Study → Practice → Integration visualisation
- **Saka calendar display** — alongside Gregorian dates
- **Moderator display content management** — shlokas, screen sections, curated content (detail TBD)
- **Vratmitra credibility/verification mechanism** — deferred from R1, must resolve before v1 ships
- **`admin.view_chat`** — admin access to VA-VM chat (TBD)
- **Chat media limits** — file size, types, retention policy (TBD)
- **Deployment details** — staging setup, managed vs. self-hosted infra choices
