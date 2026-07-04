# Changelog

User-visible changes, most recent first. Dated sections (continuous deploy to the
`dev` branch — no version numbers during beta). Every PR that changes user-visible
behaviour adds a line here (see `documentation/20_Solo-Dev-Operations.md`).

## Unreleased
- Settings → Profile now lets you edit your username (with availability check and a
  profile-URL warning), gender, and birthdate — fixing wrong-birthdate signups.
- Fixed: the en/मराठी language toggle now works on the deployed app (locale
  resolution failed behind the same-origin proxy).
- Beta feedback widget: floating corner-snapping button on all signed-in pages —
  raise an issue/improvement, see open observations, +1 existing ones (bilingual en/mr).
  Admins triage via the API with audited status changes.

## 2026-07-04
- Brand: new favicon and Open Graph link-preview image (proper Devanagari rendering).

## 2026-07-03
- 🚀 First deployment — private beta live on Railway (web + api) with Neon Postgres,
  Upstash Redis, and Cloudflare R2.
- Google login works on the deployed app (same-origin proxy for session cookies).
- Known beta limitations: real-time chat unavailable, email delivery (signup
  verification / password reset) not yet wired, search hidden.
