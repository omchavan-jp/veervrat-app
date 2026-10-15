# GitHub Actions workflows

Delivery requirements are defined in [Git and Release Governance](../../documentation/25_Git-and-Release-Governance.md).
This README describes the checked-in workflows, not proof of server-side enforcement. Track
required checks, approval gates and artifact promotion in [rollout status](../../ops/github-governance-status.md).

`ci.yml` runs on every push to `main` and every PR targeting `main`. It has no
path filter. On Node 24 it installs the root pnpm workspace, generates Prisma,
then runs lint, typecheck, API and web unit tests, and the workspace build. It
also tests the CD path classifier, validates canonical `product-design/` MDX,
JSON, links and D2 with a pinned D2 CLI, and builds the Fumadocs static export.
Shared, UAT and production Terraform are formatted and validated with backend initialization disabled,
read-only provider locking and no Azure login. The lock includes Linux CI and macOS ARM checksums.

`integration.yml` runs API integration tests with PostgreSQL and Redis service
containers. `e2e.yml` runs Playwright. Their triggers and scope are unchanged
by the product docs deployment.

`cd.yml` runs on pushes to `main`, `prod-*` tags, and manual dispatch. On main,
its `prepare` job classifies one changed-file list with
`.github/scripts/classify-changes.sh`:

Preparation no longer logs into Azure or requests OIDC; the unused UAT-domain lookup was
removed. Manual `operation=verify-build|verify-uat|verify-prod` selects a candidate
read-only permission/plan job and skips normal build/deployment jobs. The default manual
operation remains `deploy` (UAT). Verification is protected-main-only and uses separate
environment candidate variables, not the active deployment client ID. See the
[identity cutover record](../../ops/azure-identity-cutover.md) for scope and live status.

| Change on main                                                                     | UAT action                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| App, API, web, shared, or unknown path                                             | Build four app images; apply Terraform, migrate, deploy apps                                                  |
| Canonical `product-design/` content or renderer code | Build/deploy web with its static export; preserve the other deployed component references; skip migrations |
| Both app and docs paths                                                            | Build the normal app image set; one serialized UAT deployment                                                 |
| Ordinary Markdown, `documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/` only | Skip CD builds and UAT deployment                                                                             |

The classifier's fixtures are in `.github/scripts/classify-changes.test.sh`.
The Fumadocs export is built inside the web image, outside its public directory.
A docs-only deploy reads current deployed component references, builds a new web image, and
applies Terraform with the other component digests preserved. The composite
action's `deploy_apps=false` skips migrations; its docs-only Terraform apply
still passes `deploy_apps=true` to keep the existing app resources in state.
Normal app deploys read API and web references separately and hold both through the
migration step. Production promotes the accepted image set, including its static docs bytes,
while `PRODUCT_DOCS_MODE=off` keeps the route unavailable.
No separate docs Container App or docs image is built. The static export is
served only through the protected web route.

`production-release.yml` listens to completed CD tag requests, but executes its own protected
main SHA. Ordinary main/UAT CD completions are ignored. Owner-only manual operations verify
receipts without deploying, prepare an existing tag, or register a schema-reviewed rollback.
Preflight verifies trusted exact-run acceptance/checks and creates a GitHub Release with the
manifest before native prod approval. Deployment revalidates the manifest asset digest, stores
private manifest/claim records, promotes without rebuilding and publishes durable outcomes.
No triggering-run artifact or executable is trusted. All production requests share one
non-cancelling concurrency group; controller reruns, ambiguous approval and reused tags fail closed.
Rollback requires previous verified production history and changes only images/commit metadata,
with no migrations. Legacy versions without records need separate operator assessment.

Build permits main/prod-* tags, UAT only main, prod only main; desired settings are in
[environment-policy.json](../environment-policy.json). The main-only production boundary and
container-scoped record grants were activated in #364. Live production writes passed in
owner-approved `prod-2026-10-12`, controller `38262172088/1`, with private/public outcome,
exact live digest and health verification. See [release evidence](../../ops/release-controls-rollout.md).
Actual rollback and fresh production browser/Sentry delivery tests were not induced as setup checks.
The maintainer subsequently reported production working on 2026-10-15; this is owner acceptance,
not a separate per-feature or operational-drill certification.

CI lint does not apply fixes. Repo-wide `format:check` is not a CI gate.

## Security automation

The checked-in Action references use full commit SHAs and the reviewed repositories in
[`actions-policy.json`](../actions-policy.json). CI runs the
[policy checker](../scripts/check-actions-security.mjs) and its negative fixtures. Workflow tokens
default to `contents: read`; only trusted CD/controller cloud jobs request `id-token: write`.
The reviewed production controller's prepare/deploy jobs alone also receive `contents: write`
for prerequisite Releases/assets and outcomes. Other workflow write grants remain prohibited.
Public-fork runs require maintainer approval and ordinary PR jobs have no deployment OIDC grant.
Active client IDs now use separate verified identities. Legacy trusts/grants were removed by
reviewed apply, with fresh-federation rejection in [identity cutover evidence](../../ops/azure-identity-cutover.md).
Source removal alone is not an apply.
Manual `verify-legacy-revoked` authenticates the replacement as a positive control before checking
that fresh GitHub federation to the old client is specifically rejected. It does not deploy.

GitHub-managed CodeQL default setup analyzes Actions, JavaScript/TypeScript and Python on pushes,
PRs and its weekly schedule. It has no checked-in CodeQL workflow. The native main ruleset
requires completed CodeQL analysis and blocks new high/critical security findings; non-security
warnings are not a blanket merge gate. Existing findings remain tracked, not auto-dismissed.

[`dependabot.yml`](../dependabot.yml) configures weekly Monday 10:00 Asia/Kolkata updates for the
root pnpm workspace, standalone product-design tooling, workflow Actions and the deploy composite.
Minor/patch version updates are grouped; majors remain separate. Security updates are enabled
independently and do not wait for the weekly version-update schedule. Bots open PRs; they never
approve or merge them. Dependabot's first scheduled evaluation after this file reaches main is
the end-to-end configuration check; writing YAML alone does not prove an update PR was generated.

Native SHA-only enforcement is enabled after the pinned workflows merged in #319. Ordinary
checks and GitHub-managed CodeQL passed under it. See [rollout status](../../ops/github-governance-status.md)
and [remediation status](../../ops/security-remediation-status.md) for remaining security work.
