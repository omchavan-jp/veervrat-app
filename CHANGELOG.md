# Changelog

User-visible changes, most recent first. Dated sections — no semver during beta, since
there is no public API contract to version. Releases are marked by `prod-YYYY-MM-DD` tags
(see `AGENTS.md` → Git conventions). Every PR that changes user-visible behaviour adds a
line here (see `documentation/20_Solo-Dev-Operations.md`).

Note: merging to `main` ships to **UAT**, not to users. A line here is live for beta
testers only once a `prod-*` tag has been deployed.

## Unreleased

### Staying signed in, and being told when you are not

- **Signing out in one tab now takes effect in the others.** A second tab could keep showing your
  pages for up to a minute — some of them would redirect and some would not, depending on whether
  the page happened to load anything. Only a reload put it right.
- **An invitation link now tells you who invited you, even if you have no account.** It used to
  send you to the login page with no name, no mention of an invitation, and no reason for being
  there — which is the one situation where the person opening the link is most likely to be new.
- **Someone else's public reflections can be opened from their profile.** They were listed but not
  clickable, so the one place you meet another person's writing led nowhere.

### Deleting your account, and coming back

- **Deleting your account no longer says your session expired.** The deletion had worked; the
  only message on screen said otherwise. It now confirms the account was deleted.
- **If you deleted an account and sign in again, the app says so** — and on what date — instead of
  returning you to the login page with no explanation, over and over. Before this it was a silent
  loop with no way to tell what was wrong.
- **You can create a new account with the same Google address, or the same email address, after
  deleting.** Previously neither was possible: the address stayed claimed by the deleted account
  and nothing ever released it, so that address could never be used again.
- **Changing your email works when the address once belonged to a deleted account.** It failed,
  and reported that the confirmation link was invalid — about a link that was fine.
- **The email-change confirmation page says what actually went wrong.** Every failure used to read
  "this link is invalid or has expired", including cases where the link was perfectly good and
  retrying could never have helped.

### Confirming it is you

- **Being asked to confirm it is you no longer signs you out.** When the confirmation had expired —
  it lasts a few minutes, and covers one action — the app ended your session instead of asking
  again. It now asks again, and says why.
- **Mistyping your password no longer signs you out** either, whether you are changing your
  password, changing your email, or deleting your account. It says the password is not correct.
- **Signing in with an address stored in a different case now works.** Whether it did depended on
  which part of the app had last written your address, and the refusal was indistinguishable from
  a wrong password.

### Attaching images
- **Attaching an image now works at all.** Any photo larger than roughly 75KB — which is nearly
  every photo — failed with "an unexpected error occurred". Images were accepted in principle and
  every realistic one was rejected.
- **The app now tells you when something goes wrong.** Error messages across 51 places, including
  every "couldn't save", were being sent nowhere at all. A failure looked identical to nothing
  happening.
- **Images you attach are private.** A picture in a private conversation, or in a reflection you
  have not published, can no longer be opened by anyone who happens to have its address. It is
  served only to people allowed to see the thing it belongs to — so an image in a published
  entry stays visible to everyone, and one in a private entry does not.
- **Photos no longer carry where they were taken.** Phone cameras record GPS coordinates and a
  timestamp inside the image. Publishing a reflection would have published those too, which
  nobody chose and most people do not know is there. All of it is now removed, after the photo's
  own orientation has been applied so it still appears the right way up.
- Large photos are scaled down before being stored, so a reflection loads quickly.
- Fixed: an attached image showed as a broken picture in the editor.

### Reading and writing
- **You can now open an experience log and read it.** Until now they could be written and edited
  but never viewed — not by their author, not by a vratmitra, and not by anyone visiting a log
  its author had deliberately published. Both lists now link to it.

### Signing in
- **If you signed up with Google, you can now add a password**, so a lost Google account no
  longer means a lost Veervrat account. Settings says plainly when Google is the only way in.
- **You can now delete your account or change your email address if you signed in with Google.**
  Both previously required a password, which such an account has never had — so neither was
  possible at all. Deleting your own account is a right, not a convenience.
- **Password recovery now tells you the truth.** Asking to reset a password for an address with
  no account said the same thing as asking for one that exists, so a typo was indistinguishable
  from an email that never arrived. It now says when no account exists, and when an account signs
  in with Google it offers to send a link to add a password.
- Fixed: the link for adding a first password sent you to the dashboard if you were already
  signed in — which you always are, since the flow starts in Settings. The same trap affected
  verification and email-change links.

### Your data
- **You can download everything the app holds about you** as a single file — your entries,
  journeys, messages, consents and the notes your vratmitra has written about you.
- Fixed: signed-in users could not open the terms or privacy policy at all. A document nobody can
  open is not one anyone can be asked to accept.

### Internal
- Error reporting is now wired on the web app as well as the server, so failures a person sees in
  their browser reach us rather than only server-side ones.
- A spending control now stops the platform if monthly cost crosses a threshold, rather than only
  emailing about it. The card backing this subscription belongs to an individual.
- Fixed: admin records of who was granted what named people by display name, which is not unique.

- Veervrat is now for adults aged 18 and over. Signing up asks for your date of birth and asks
  you to accept the terms; both are recorded. Signing up with Google now asks for these first,
  before Google is involved.
- Your date of birth is never shown on your profile, and is not sent to anyone viewing it.
- Gender, if you choose to provide it, now appears on your profile. Leaving it blank means it is
  not shown — there is nothing extra to configure.
- Admins can now grant individual people access to specific features — the beta feedback widget,
  and the in-context content editor — from a user's admin page, instead of that requiring a code
  change and a deployment for each person.
- Fixed, internal: the feedback widget was hidden rather than blocked for people who should not
  have had it. The button was not shown, but the underlying endpoint accepted anyone signed in.
- Fixed, internal: granting someone content-editor access saved but did nothing. Two separate
  causes — the feature's environment switch was set nowhere, and the editor itself was compiled
  out of every deployed build by a flag fixed at build time.
- Fixed, internal: every environment shipped a complete admin dashboard that nobody could open —
  the role it requires could only be granted by someone who already had it. There is now a
  deliberate, audited way to grant the first administrator.
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
