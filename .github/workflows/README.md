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

| Change on main | UAT action |
|---|---|
| App, API, web, shared, or unknown path | Build four app images; apply Terraform, migrate, deploy apps |
| Canonical `product-design/` content or renderer code | Build and deploy the web image with its static export; preserve API and migration image tags; skip migrations |
| Both app and docs paths | Build the normal app image set; one serialized UAT deployment |
| Ordinary Markdown, `documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/` only | Skip CD builds and UAT deployment |

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
