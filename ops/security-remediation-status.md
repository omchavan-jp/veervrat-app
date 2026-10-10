# STATE — Security Remediation

Owner: `omchavan-jp`. Verified: 2026-10-10.
Refresh when: remediation merges, scanner findings change, or an upstream fix becomes available.
This describes tested candidate changes; dependency findings on main close only after merge and
GitHub's dependency graph refresh. The initial [baseline](audit/github-security-baseline-2026-10-10.md)
remains a frozen record.

## Completed security-control rollout

[PR #319](https://github.com/omchavan-jp/veervrat-app/pull/319) merged at
`18b8ca4b36c07721d0a9362b3a6eaf0992ee1f2a`. Native SHA-only enforcement is enabled and was
read back alongside the selected nine-pattern Action allowlist. Post-merge CI, integration,
E2E, CodeQL and UAT CD all completed successfully. No production tag/deployment was created.
CodeQL workflow-permission alerts #1, #2 and #3 are fixed on main.

## Dependency candidate

Both pnpm lockfiles were checked against every open GitHub advisory, normalizing ranges and
using known vulnerable/patched controls. The candidate resolves 175 of 176 baseline alert
records, including all seven critical records. These are alert records, not 175 distinct bugs.

- Upgrade application and renderer Next.js to 16.3.8; align eslint-config-next.
- Upgrade affected direct dependencies, including Nodemailer 10, Joi, sharp and Vitest.
- Refresh dependencies within declared constraints and force only vulnerable transitive ranges
  to published fixes using 16 explicit overrides. The deepmerge-ts 7-to-8 security override is
  a major transitive change; Prisma config/client generation and application tests/builds verify
  the current consumer paths. Do not remove the override before the parent constraints are safe.
- Preserve the main-branch Prettier 3.8.3 version to avoid unrelated reformatting. Update the test
  fixture typing and private adapter logger for compatibility with refreshed tooling/Nest.
- Reclassify the shadcn code generator as a development dependency: no runtime imports were
  found. The standalone web build's package inventory included Next as a positive control and
  no separately installed braces/shadcn package. That is not proof about every vendored bundle.

## One unresolved upstream advisory

Dependabot #150 / GHSA-vfj7-8cjw-p6xm affects braces <=3.0.3. GitHub lists no published patched
version. It arrives through micromatch/fast-glob in the Next lint toolchain and shadcn code
generation. The development-only classification reduces runtime dependency exposure but does
not fix the library or remove the alert. Keep it open; do not dismiss it merely to obtain a
zero-alert dashboard. A maintained upstream release, a separately reviewed vendor patch, or
replacement of the parent tooling is needed for complete resolution.

## CodeQL dispositions

| Alert                          | Disposition                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1–#3 workflow permissions     | Fixed on main after #319; API read-back verified                                                                                                                                                                          |
| #4 incomplete markup filtering | Candidate uses the already-approved sanitize-html parser; regression tests preserve prose IDs while stripping attributes/code/script content                                                                              |
| #5 insecure test randomness    | Candidate uses Node cryptographic random bytes for ephemeral test IDs                                                                                                                                                     |
| #6 sensitive cookie storage    | Dismissed as false positive after tracing changePassword to a fresh independent 32-byte session lookup key; it never returns the supplied password/hash. Production cookie flags and token/server-lookup regressions pass |
| #7 disabled Helmet protection  | Candidate keeps default CSP on API JSON/image responses; integration regression asserts the header                                                                                                                        |

The #6 assessment is specific to this flow. It does not claim a complete auth audit or database
token-at-rest hardening. No session format or product authorization change was introduced.

## Verification and limitations

- Local API unit tests: 1,073 passed; web tests: 360 passed.
- Focused cookie/token and adapter/export checks passed; sanitizer tests: 2 passed.
- Lint/typecheck and API/web production builds passed; renderer webpack static export passed.
- Advisory-range verification: one remaining high record, zero critical records in the candidate.
- The web build reports dynamic-filesystem tracing warnings for the existing protected docs route;
  this change does not silence those warnings or redesign its filesystem boundary.
- Real Postgres/Redis integration, Playwright and CodeQL verification run on the remediation PR.
  Do not label the candidate deployed or the GitHub alert inventory cleared before merge.
- OpenSpec, database schemas/migrations and production deployment controls are unchanged.
