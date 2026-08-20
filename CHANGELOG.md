# Changelog

User-visible changes, most recent first. Dated sections — no semver during beta, since
there is no public API contract to version. Releases are marked by `prod-YYYY-MM-DD` tags
(see `AGENTS.md` → Git conventions). Every PR that changes user-visible behaviour adds a
line here (see `documentation/20_Solo-Dev-Operations.md`).

Note: merging to `main` ships to **UAT**, not to users. A line here is live for beta
testers only once a `prod-*` tag has been deployed.

## Unreleased
- Fixed: if your session ended while the app was open — you signed out in another window, or
  reset your password elsewhere — the app kept looking signed in and showed "please try again"
  errors on every page. It now takes you to the login page instead.
- Fixed: pages could hang on the loading spinner for many seconds while the app repeatedly
  asked the server who you were — hundreds of times a second, until the server started
  refusing. Affected every screen, signed in or out.
- You can now switch language and light/dark mode from the login, signup and password-recovery
  screens, and during onboarding — previously these only appeared after you were fully signed in
  and past onboarding, so a Marathi reader had no way to read the very page they needed to get
  in. Signing in still restores the language saved on your account.
- Onboarding now has a way out: you can log out part-way through instead of closing the tab.
- If your account was never verified, you can now get back in. Signing in with an unverified
  address explains what's wrong and offers to send a fresh verification email, instead of just
  refusing. Completing a password reset, or linking your Google account, now also verifies the
  address — since both already prove you own it.

## 2026-08-17 (prod-2026-08-17)
- **Signing up with an email address now works.** Verification and password-reset emails
  actually send — they never have before in any deployed environment, so an account created
  with an email address could not previously be logged into.
- The site now runs on its real address, `veervrat.jnanaprabodhini.org`, with HTTPS.
- Fixed: link previews (when you share a page in a chat app) showed the wrong address.
- Fixed, internal: production was reading and writing the test environment's database. No
  user data was affected — production had no users at the time.

## 2026-08-16 (prod-2026-08-16)
- 🚀 Migrated off Railway/Neon/Upstash/R2 to Azure (Container Apps, Postgres Flexible
  Server, Azure Managed Redis) via Terraform, with a GitHub Actions CD pipeline
  (OIDC, no stored secrets). This is the first release on the new UAT → prod flow:
  merges to `main` deploy to UAT automatically; a `prod-*` tag promotes that exact
  image to prod. Object storage (Blob) and email are not yet wired — see
  `DEPLOYMENT.md`.
- Deploys no longer interrupt you mid-action: the app now finishes requests already in
  flight before shutting down, so a restart can't lose a submission you just made.
- Fixed: the stricter limits on signup, login and password-reset attempts were not
  actually being applied — those endpoints fell back to the general limit.
- Fixed: inviting an existing user (found via search) no longer offers the confusing
  "Platform invite" option, which silently failed to notify them or create the
  vratmitra relationship. Also fixed the in-app notification for a vratmitra
  invitation routing to the dashboard instead of the invitations page.
- Weakness test: submitting with sentences left blank now asks for confirmation
  first, since submission is final and can't be undone.
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
