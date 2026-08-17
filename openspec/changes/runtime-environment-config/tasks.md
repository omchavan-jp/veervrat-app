## 0. Guardrail

- [ ] 0.1 Read `documentation/21_Infrastructure-Conventions.md` §17 before starting — it
  records how this defect stayed invisible, which is what the verification steps below exist
  to prevent recurring.

## 1. API — accept the new origin and cookie scope (ships FIRST, alone)

The api must be ready before any browser calls it directly. Reversed, the first request from
the new frontend fails CORS.

- [ ] 1.1 Add `COOKIE_DOMAIN` to the api config module and its Joi validation schema —
  optional, absent in local dev. Note that `GOOGLE_*` currently bypass the Joi schema
  (`11_Backend-Conventions.md`); do not repeat that pattern here.
- [ ] 1.2 Apply `COOKIE_DOMAIN` to every auth cookie: session and `csrf-token`
  (`auth.controller.ts`, `users.controller.ts`, `csrf.middleware.ts`). Prefer a single shared
  cookie-options helper over repeating the object at each call site — there are four.
- [ ] 1.3 Unit-test the cookie options helper: with `COOKIE_DOMAIN` set the attribute is
  present, without it the cookie is host-only.
- [ ] 1.4 Terraform: add `cookie_domain` and set `COOKIE_SAMESITE=lax` per environment; point
  `FRONTEND_URL` at the custom domain (`veervrat.jnanaprabodhini.org` /
  `uat.veervrat.jnanaprabodhini.org`). Both are module inputs — declare them in the `envs/uat`
  and `envs/prod` wrappers too, or CI fails on an undeclared variable (§14).
- [ ] 1.5 Deploy the api to UAT alone and verify with the proxy still in place that nothing
  regressed: log in through a browser, reload, perform a state-changing action, log out.

## 2. Web — runtime configuration

- [ ] 2.1 Add a typed runtime-config module read server-side (`apiBaseUrl`, `siteUrl`,
  `feedbackMode`, `contentEdit`), sourced from non-`NEXT_PUBLIC_` server env vars.
- [ ] 2.2 Add a client provider supplying that config, populated from a root server component.
- [ ] 2.3 Replace `process.env.NEXT_PUBLIC_API_URL` in all six call sites
  (`lib/api/client.ts`, `settings/page.tsx`, `signup/page.tsx`, `login/page.tsx`,
  `verify-email/page.tsx`, `chat-thread-client.tsx`) with the provider value.
- [ ] 2.4 Replace `NEXT_PUBLIC_SITE_URL` in `app/layout.tsx` with the runtime value, fixing the
  `og:url` / `og:image` defect (currently pointing at UAT from prod).
- [ ] 2.5 Move `NEXT_PUBLIC_FEEDBACK_MODE` and `NEXT_PUBLIC_CONTENT_EDIT` to runtime config as
  **environment-level** toggles only. Per-user grants stay out of scope (D20, B1).
- [ ] 2.6 Keep `NEXT_PUBLIC_COMMIT_SHA` baked — it describes the image, not the environment.
- [ ] 2.7 Delete the `rewrites()` proxy and the `API_ORIGIN` module-scope read from
  `next.config.ts`; remove `proxy.ts` if it becomes unused.
- [ ] 2.8 Update `apps/web/.env.example` and `documentation/02_Local-Development-Setup.md` —
  local dev now needs an absolute api URL rather than the relative `/api/v1`.

## 3. CD and Terraform

- [ ] 3.1 Remove `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FEEDBACK_MODE`,
  `API_ORIGIN` from the web image build args in `cd.yml`. Leave `NEXT_PUBLIC_COMMIT_SHA`.
- [ ] 3.2 Set the corresponding runtime env vars on the web Container App in Terraform, per
  environment.
- [ ] 3.3 Add the post-deploy wiring check to the deploy action: assert the deployed web tier
  resolves to its **own** environment's api, and fail the deploy otherwise. This is the check
  whose absence let the defect ship.

## 4. Verification — browser, not curl

`curl` ignores `SameSite` and does not enforce CORS, so it cannot detect the failure modes this
change risks. Each item below is a real browser against UAT.

- [ ] 4.1 Log in with credentials; confirm the session persists across a reload.
- [ ] 4.2 Perform a state-changing action (CSRF double-submit passes across hosts).
- [ ] 4.3 Log out; confirm the session is cleared.
- [ ] 4.4 Confirm in devtools that no request goes to a `*.azurecontainerapps.io` host and none
  to another environment's hostname.
- [ ] 4.5 Confirm `og:url` on UAT names the UAT custom domain.
- [ ] 4.6 Re-run the check that found the defect: the `auth/google` redirect issued through the
  UAT web origin must carry a UAT `redirect_uri`, and likewise for prod after promotion.

## 5. Ship and document

- [ ] 5.1 Merge to `main`; confirm UAT deploys and re-run §4 against it.
- [ ] 5.2 Cut a `prod-*` tag; re-run §4 against prod, including a real login.
- [ ] 5.3 Update `DEPLOYMENT.md`: the proxy is gone, the api is browser-reachable, and the
  post-deploy wiring check is part of the procedure.
- [ ] 5.4 Update `documentation/13_Frontend-Conventions.md` with the runtime-config rule so the
  next `NEXT_PUBLIC_*` addition is questioned rather than copied.
- [ ] 5.5 Update `documentation/21_Infrastructure-Conventions.md` §17 with the outcome.
- [ ] 5.6 CHANGELOG entry.
- [ ] 5.7 Archive this change.
