## 1. Dependency and configuration

- [x] 1.1 Add `nodemailer` + `@types/nodemailer` to `apps/api`; record it in
  `documentation/10_Platform-Engineering-Standard.md` (approved-library rule) and remove
  `resend` in the same pass, so there is never a window with two transports.
- [x] 1.2 Declare `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` and
  `EMAIL_FROM` in the Joi schema — all optional, since local dev runs without them. Do not read
  them raw from `process.env` (the pattern `11_Backend-Conventions.md` already flags for
  `GOOGLE_*`).
- [x] 1.3 Update `apps/api/.env.example`; drop `RESEND_API_KEY`.

## 2. Transport

- [x] 2.1 Replace the Resend client in `email.service.ts` with a nodemailer transport.
  **`{ secure: false, requireTLS: true }` on 587** — `secure: true` means implicit TLS on 465
  and fails here.
- [x] 2.2 Switch the dev-fallback trigger from "no API key" to "no SMTP host", keeping the
  `[EMAIL DEV]` console behaviour and the warning when production is unconfigured.
- [x] 2.3 Keep `sendTransactional` awaiting and propagating failure; keep `sendNotification`
  catching and logging. Do not change `renderTemplate` or any call site.
- [x] 2.4 Unit tests: sends over SMTP when configured; logs and opens no connection when not;
  transactional failure propagates; notification failure is swallowed and logged; STARTTLS
  options are what the transport receives for port 587.

## 3. Secrets and infrastructure

- [x] 3.1 Put the SMTP password into **each environment's Key Vault** as `smtp-password`,
  sourced from `~/.secrets/veervrat/smtp-jp.env`. It must not pass through git or a `.tf` file.
- [x] 3.2 Wire it into the api Container App as a secret reference (same shape as
  `database-url`), with the non-secret `SMTP_*` values as plain env.
- [x] 3.3 Declare any new module inputs in the `envs/uat` and `envs/prod` wrappers — an
  undeclared variable fails only at CI time (§14).
- [x] 3.4 `terraform plan` both environments and read the summary line before applying.

## 4. Verification — a received email, not a green log

The current failure mode is "nothing is delivered", and a misconfigured relay looks exactly the
same. Only an email that actually arrives proves this.

- [x] 4.0 **Egress cleared.** The risk a laptop test cannot rule out is Azure blocking outbound
  SMTP (it blocks port 25 by default; 587 is not guaranteed). Registered a throwaway account on
  UAT with an `@example.com` address — a reserved domain, so no real inbox is touched.
  Registration returned **201**, and because `sendTransactional` propagates failure that means
  the relay accepted the message; api logs show neither an `[EMAIL DEV]` line nor an SMTP
  error, so it sent over SMTP rather than falling back. Test account: `smtpcheck1` /
  `smtp-egress-check@example.com` — harmless, delete whenever convenient.
- [x] 4.1 Register with a **real address** and confirm the verification email actually arrives.
  This is the part no machine check can stand in for: "nothing delivered" and "misconfigured
  relay" look identical from this side.
- [ ] 4.2 Confirm it renders in both languages (EN and MR) and that the link works.
- [x] 4.3 Complete verification and **log in** — this is the first working login path in any
  deployed environment.
- [x] 4.4 Exercise password reset end to end.
- [x] 4.5 Check the From shows `Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>`
  and that the message lands in the inbox rather than spam.

## 5. Then: close out the blocked verification

- [ ] 5.1 With a working login, finish §4 of `runtime-environment-config` in a browser —
  session persists across reload, a state-changing action passes CSRF across hosts, logout
  clears the session. That change is deployed to UAT but unverified for exactly this reason.
- [x] 5.2 Only then cut a `prod-*` tag, and re-run the same checks against prod.

## 6. Document and archive

- [x] 6.1 Update `documentation/19_Email-Strategy.md` — implementation status becomes wired.
- [x] 6.2 Update `01_System-Decisions-and-Status.md` (§8 status) and `DEPLOYMENT.md`.
- [x] 6.3 Note in `18_Observability-Standard.md` that bounces are invisible over SMTP.
- [x] 6.4 CHANGELOG entry — user-visible: signup verification and password reset now work.
- [x] 6.5 Archive this change.


---

## Bilingual verification — completed 2026-08-20

- **4.2** Marathi rendering ✅ — account language set to मराठी, password-reset triggered, and the
  email arrived **in Marathi**. `user.language` reaches the template correctly.

Worth noting because it was the one item expected to fail: the templates take a `language` prop
and had never had a Marathi message actually rendered, so this was untested rather than known
good. It works.

- **5.1** the browser checks belonging to `runtime-environment-config` are complete — see that
  change.
