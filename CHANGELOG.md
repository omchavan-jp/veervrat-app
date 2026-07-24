# Changelog

User-visible changes, most recent first. Dated sections (continuous deploy to the
`dev` branch — no version numbers during beta). Every PR that changes user-visible
behaviour adds a line here (see `documentation/20_Solo-Dev-Operations.md`).

## Unreleased
- Weakness test: an opt-in "Auto next" toggle advances to the next sentence right
  after you pick a score (off by default; your preference is remembered).
- Fixed: corrected the Marathi word for "app" (ॲप) in two places where it used a
  non-standard spelling.
- Beta feedback: a "show resolved" toggle reveals Done/Declined observations (hidden
  by default), and expanding a resolved item now shows why — the resolution note
  (required when marking done) or the existing decline reason.
- Fixed: the profile page header no longer overflows on mobile — the title and the
  two action buttons now stack instead of being forced onto one row.
- Fixed: the journey title no longer overflows past the screen edge on mobile — it
  now wraps like the rest of the page instead of staying on one unbreakable line.
- Weakness test: "Next" is now the prominent button (matching "Review responses"),
  since it's used far more often than the final review/submit step.
- Fixed: the language toggle now shows the language you'd switch TO, not the one
  you're currently in — e.g. it now reads "मराठी" while the app is in English.
- Fixed: searching for a vratmitra to invite (by email, username, or name) now works
  reliably — previously only an exact, full email address matched, and username/name
  search silently returned nothing since it depended on Meilisearch, which isn't
  deployed yet. Partial email now matches too, and username/name search no longer
  depends on Meilisearch.
- Beta feedback: observations now show who raised them, plus a "show details" toggle
  to expand/collapse descriptions (tap an item to expand just that one). Two new
  feedback types added — Modification and Addition — alongside Issue and Improvement.
- Fixed: the feedback widget no longer hides behind the bottom navigation bar on
  phones and tablets.
- Language switching is now instant: the chosen language is cached in a cookie, so
  pages no longer wait on a per-request preference lookup.
- Settings → Connected accounts now offers "Connect" for Google, so credential
  users can link Google sign-in (unlink already existed).
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
