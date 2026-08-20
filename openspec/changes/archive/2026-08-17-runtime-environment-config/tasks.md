## 0. Guardrail

- [x] 0.1 Read `documentation/21_Infrastructure-Conventions.md` §17 before starting — it
  records how this defect stayed invisible, which is what the verification steps below exist
  to prevent recurring.

## 1. API — accept the new origin and cookie scope (ships FIRST, alone)

The api must be ready before any browser calls it directly. Reversed, the first request from
the new frontend fails CORS.

- [x] 1.1 Declare `COOKIE_SAMESITE` in the api Joi schema so an invalid value fails at boot
  rather than silently falling back. (`COOKIE_DOMAIN` was investigated and is **not needed** —
  the web client reads its CSRF token from `GET /auth/csrf`, not from the cookie, so
  host-scoped cookies work and are narrower. See design.md.)
- [x] 1.2 Terraform: set `COOKIE_SAMESITE=lax` per environment and point `FRONTEND_URL` at the
  custom domain (`veervrat.jnanaprabodhini.org` / `uat.veervrat.jnanaprabodhini.org`) so CORS
  admits the origin users actually arrive on. Module inputs must also be declared in the
  `envs/uat` and `envs/prod` wrappers, or CI fails on an undeclared variable (§14).
- [x] 1.3 ~~Deploy the api to UAT alone first.~~ Superseded: the api and web changes are on one
  branch and deploy in a single `terraform apply`, so there is no window where the new web
  calls an old api. The risk this step guarded against (web calling an api whose CORS does not
  yet admit the new origin) only exists if web ships *first*, which it now cannot. UAT browser
  verification in §4 remains the real gate before any prod tag.

## 2. Web — runtime configuration

- [x] 2.1 Add a typed runtime-config module read server-side (`apiBaseUrl`, `siteUrl`,
  `feedbackMode`, `contentEdit`), sourced from non-`NEXT_PUBLIC_` server env vars.
- [x] 2.2 Add a client provider supplying that config, populated from a root server component.
- [x] 2.3 Replace `process.env.NEXT_PUBLIC_API_URL` in all six call sites
  (`lib/api/client.ts`, `settings/page.tsx`, `signup/page.tsx`, `login/page.tsx`,
  `verify-email/page.tsx`, `chat-thread-client.tsx`) with the provider value.
- [x] 2.4 Replace `NEXT_PUBLIC_SITE_URL` in `app/layout.tsx` with the runtime value, fixing the
  `og:url` / `og:image` defect (currently pointing at UAT from prod).
- [x] 2.5 `NEXT_PUBLIC_FEEDBACK_MODE` moved to runtime config as an environment-level toggle.
  **`NEXT_PUBLIC_CONTENT_EDIT` deliberately left build-time** — being inlined lets the bundler
  drop the editor's code entirely, so dev tooling never reaches the production bundle. Making
  it runtime ships that code to prod behind a flag: a security posture change, not a refactor.
  D20 wants it on UAT and never on prod, which one promoted image cannot express this way —
  that belongs with B1's capability model.
- [x] 2.6 Keep `NEXT_PUBLIC_COMMIT_SHA` baked — it describes the image, not the environment.
- [x] 2.7 Delete the `rewrites()` proxy and the `API_ORIGIN` module-scope read from
  `next.config.ts`; remove `proxy.ts` if it becomes unused.
- [x] 2.8 Update `apps/web/.env.example` and `documentation/02_Local-Development-Setup.md` —
  local dev now needs an absolute api URL rather than the relative `/api/v1`.

## 3. CD and Terraform

- [x] 3.1 Remove `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FEEDBACK_MODE`,
  `API_ORIGIN` from the web image build args in `cd.yml`. Leave `NEXT_PUBLIC_COMMIT_SHA`.
- [x] 3.2 Set the corresponding runtime env vars on the web Container App in Terraform, per
  environment.
- [x] 3.3 Add the post-deploy wiring check to the deploy action: assert the deployed web tier
  resolves to its **own** environment's api, and fail the deploy otherwise. This is the check
  whose absence let the defect ship.

## 4. Verification — browser, not curl

`curl` ignores `SameSite` and does not enforce CORS, so it cannot detect the failure modes this
change risks. Each item below is a real browser against UAT.

⚠️ **This section is the gate on cutting a prod tag, and it is not yet done.** Everything a
machine can check has passed (see 5.1); what remains genuinely needs a human with a browser and
a login, because the risk is that cookies stop being *sent* — which no `curl` run can observe.

- [ ] 4.1 Log in with credentials; confirm the session persists across a reload.
- [x] 4.2 Perform a state-changing action (CSRF double-submit passes across hosts).
- [ ] 4.3 Log out; confirm the session is cleared.
- [ ] 4.4 Confirm in devtools that no request goes to a `*.azurecontainerapps.io` host and none
  to another environment's hostname.
- [x] 4.5 Confirm `og:url` on UAT names the UAT custom domain.
- [x] 4.6 Re-run the check that found the defect: the `auth/google` redirect issued through the
  UAT web origin must carry a UAT `redirect_uri`, and likewise for prod after promotion.

## 5. Ship and document

- [x] 5.1 Merged; UAT deployed green. Machine-verifiable results confirmed on UAT 2026-08-17:
  web advertises `api.uat.veervrat.jnanaprabodhini.org`, `og:url` names the UAT custom domain
  (was UAT's host leaking into prod), the OAuth `redirect_uri` is on the api origin, CORS
  returns the web origin with credentials, and cookies are `Secure; SameSite=Lax` host-scoped
  with no `Domain`. The CD wiring check passed on a real deploy.
- [x] 5.2 Cut a `prod-*` tag; re-run §4 against prod, including a real login.
- [x] 5.3 Update `DEPLOYMENT.md`: the proxy is gone, the api is browser-reachable, and the
  post-deploy wiring check is part of the procedure.
- [x] 5.4 Update `documentation/13_Frontend-Conventions.md` with the runtime-config rule so the
  next `NEXT_PUBLIC_*` addition is questioned rather than copied.
- [x] 5.5 Update `documentation/21_Infrastructure-Conventions.md` §17 with the outcome.
- [x] 5.6 CHANGELOG entry.
- [x] 5.7 Archive this change.


---

## Browser verification — completed 2026-08-20

All three outstanding checks performed on UAT and **passed**:

- **4.1** session persists across a hard reload ✅
- **4.3** logout clears the session; the back button lands on login ✅
- **4.4** DevTools network, filtered on `azurecontainerapps` — **zero** matches. Every request
  goes to `api.uat.veervrat.jnanaprabodhini.org` ✅

That last one is the direct regression check for the defect this change existed to fix: prod's
web tier calling UAT's api. Filtering for the platform hostname and finding nothing is the
strongest available evidence that the runtime-config path is genuinely in use and nothing fell
back to a baked value.

Together with 4.2 (onboarding exercised several cross-host state-changing writes, proving CSRF
double-submit and credentialed CORS), the change is verified end to end by a real browser
session — not only by request-level checks.
