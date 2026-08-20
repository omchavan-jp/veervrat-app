## Why

**Email has never been delivered, and that now blocks more than email.**

`EmailService` is fully wired — `register`, `forgotPassword` and the email-change flow all call
`sendTransactional` with rendered bilingual templates. What is missing is only the transport: it
speaks the Resend API, no Resend account exists, and D9 has since chosen JP IT's own SMTP relay
instead.

Two consequences make this the next thing rather than a later nicety:

1. **Credential signup is unusable.** Login refuses any account whose email is unverified
   (`auth.service.ts` → `EmailNotVerifiedException`), and only a delivered verification link can
   set `emailVerifiedAt`. A user can register and then never log in.
2. **It blocks verifying the auth changes just shipped.** `runtime-environment-config` changed
   cookies, CORS and the CSRF path; those can only be proven by a real browser session. A fresh
   environment has **no users at all** (the seed loads content only) and Google OAuth carries the
   placeholder default in both environments, so there is currently no way to obtain a session on
   UAT. Email is the shortest path to one. See `21_Infrastructure-Conventions.md` §18.

D9 was flipped after the relay's credentials were verified authenticating (`235`) and a test
message reached a Gmail inbox rather than spam.

## What Changes

**1. Transport swaps from the Resend SDK to SMTP via nodemailer.**
Only the transport. Template rendering (React Email → HTML + text), the
`sendTransactional`/`sendNotification` split, and every call site stay as they are — the
abstraction that made the original choice reversible is what makes this cheap.

**2. Configuration moves from `RESEND_API_KEY` to the `SMTP_*` set,** validated in the Joi
schema rather than read raw from `process.env`.

⚠️ **Port 587 with TLS means STARTTLS**, i.e. `{ secure: false, requireTLS: true }`.
`secure: true` selects implicit TLS on port 465 and fails against this server with an opaque
handshake error. This is the single most likely way to misconfigure it.

**3. The password goes into Key Vault per environment**, delivered to the app the same way the
database and Redis credentials already are — as a secret reference, never a plain env value.

**4. `resend` is removed** from `package.json` so there is one transport, not two.

**5. The dev/console fallback is preserved**, and its trigger changes from "no API key" to "no
SMTP host": local development still logs instead of sending, with no credentials needed.

### Explicitly not in scope

- **Google OAuth credentials (O23)** — the other way to obtain a session. Sequenced after this.
- **Bounce handling.** An SMTP relay exposes no delivery webhook, unlike Resend. Send failures
  are logged; bounces after acceptance are invisible to us. Noted in `18_Observability-Standard.md`.
- **Rate limiting on outbound mail.** The relay's limits are unknown — ask JP IT before any bulk
  send. Not a v1 concern at beta volumes.

## Impact

- Affected specs: `email-module`
- Affected code: `apps/api/src/modules/email/email.service.ts`, `config/config.module.ts`,
  `apps/api/package.json`, `.env.example`,
  `infra/terraform/modules/environment/{keyvault,container-apps}.tf`, and the `envs/*` wrappers
- **Risk is bounded but real:** nothing can regress *below* today's behaviour, since today
  nothing is delivered at all. The failure mode to watch is the opposite — mail that silently
  does not arrive, which looks identical to the current state. Verification therefore has to be
  an actual received email, not a green log line.
- The SMTP password is a genuine secret and must reach Key Vault without passing through git.
  It currently lives only in `~/.secrets/veervrat/smtp-jp.env` (mode 600).
