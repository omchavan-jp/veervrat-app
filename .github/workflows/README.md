# GitHub Actions workflows

Delivery requirements are defined in [Git and Release Governance](../../documentation/25_Git-and-Release-Governance.md).
This README describes the checked-in workflows, not proof of server-side enforcement. Track
required checks, approval gates and artifact promotion in [rollout status](../../ops/github-governance-status.md).

`ci.yml` runs on every push to `main` and every PR targeting `main`. It has no
path filter. On Node 24 it installs the root pnpm workspace, generates Prisma,
then runs lint, typecheck, API and web unit tests, and the workspace build. It
also tests the CD path classifier, validates canonical `product-design/` MDX,
JSON, links and D2 with a pinned D2 CLI, and builds the Fumadocs static export.

`integration.yml` runs API integration tests with PostgreSQL and Redis service
containers. `e2e.yml` runs Playwright. Their triggers and scope are unchanged
by the product docs deployment.

`cd.yml` runs on pushes to `main`, `prod-*` tags, and manual dispatch. On main,
its `prepare` job classifies one changed-file list with
`.github/scripts/classify-changes.sh`:

| Change on main                                                                     | UAT action                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| App, API, web, shared, or unknown path                                             | Build four app images; apply Terraform, migrate, deploy apps                                                  |
| Canonical `product-design/` content or renderer code                               | Build and deploy the web image with its static export; preserve API and migration image tags; skip migrations |
| Both app and docs paths                                                            | Build the normal app image set; one serialized UAT deployment                                                 |
| Ordinary Markdown, `documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/` only | Skip CD builds and UAT deployment                                                                             |

The classifier's fixtures are in `.github/scripts/classify-changes.test.sh`.
The Fumadocs export is built inside the web image, outside its public directory.
A docs-only deploy reads the current API tag, builds a new web tag, and applies
Terraform with API and migration images pinned to the old tag. The composite
action's `deploy_apps=false` skips migrations; its docs-only Terraform apply
still passes `deploy_apps=true` to keep the existing app resources in state.
Normal app deploys read API and web tags separately and hold both through the
migration step. Production tags rebuild the normal app image set, including the
static docs bytes, while `PRODUCT_DOCS_MODE=off` keeps the route unavailable.
No separate docs Container App or docs image is built. The static export is
served only through the protected web route.

The current production tag workflow **rebuilds** app images. The agreed governance policy
requires promotion of accepted digests without rebuild and approval before all production
changes. Those workflow changes are separate implementation tasks; this documentation PR
does not implement them.

CI lint does not apply fixes. Repo-wide `format:check` is not a CI gate.

## Security automation

The checked-in Action references use full commit SHAs and the reviewed repositories in
[`actions-policy.json`](../actions-policy.json). CI runs the
[policy checker](../scripts/check-actions-security.mjs) and its negative fixtures. Workflow tokens
default to `contents: read`; only CD jobs that use Azure login request `id-token: write`.
Public-fork runs require maintainer approval and ordinary PR jobs have no deployment OIDC grant.
This does not yet split the shared Azure identity; that remains separate release-control work.

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

Native SHA-only enforcement must be switched on after these pins reach main, so old workflows are
not disabled mid-rollout. See [rollout status](../../ops/github-governance-status.md) for that last step.
