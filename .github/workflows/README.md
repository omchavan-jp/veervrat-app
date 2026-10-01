# GitHub Actions workflows

`ci.yml` runs on every push to `main` and every PR targeting `main`. It has no
path filter. On Node 24 it installs the root pnpm workspace, generates Prisma,
then runs lint, typecheck, API and web unit tests, and the workspace build. It
also tests the CD path classifier, validates canonical `product-design/` MDX,
JSON, links and D2 with a pinned D2 CLI, and builds the standalone Fumadocs
renderer.

`integration.yml` runs API integration tests with PostgreSQL and Redis service
containers. `e2e.yml` runs Playwright. Their triggers and scope are unchanged
by the product docs deployment.

`cd.yml` runs on pushes to `main`, `prod-*` tags, and manual dispatch. On main,
its `prepare` job classifies one changed-file list with
`.github/scripts/classify-changes.sh`:

| Change on main | UAT action |
|---|---|
| App, API, web, shared, or unknown path | Build four app images; apply Terraform, migrate, deploy apps |
| Canonical `product-design/` content or renderer code | Build and deploy `veervrat-docs` only; preserve app images and skip migrations |
| Docs-specific Terraform | Build docs image and apply UAT infrastructure |
| Both app and docs paths | Build both image sets; one serialized UAT deployment |
| Ordinary Markdown, `documentation/`, `ops/`, `openspec/`, `spec/`, `.claude/` only | Skip CD builds and UAT deployment |

The classifier's fixtures are in `.github/scripts/classify-changes.test.sh`.
UAT docs use a separate image tag and an internal-only Container App. A docs-only
deploy reads the currently deployed app tag so Terraform does not move API/web
to an image that was never built. An app-only deploy preserves the current docs
tag. The `prod-*` tag path continues to build and deploy the app images; it
does not build or deploy docs. Product docs mode and the docs Container App are
explicitly off in production Terraform.

The current production tag workflow **rebuilds** app images. Older repository
guidance describes artifact promotion without a rebuild; that discrepancy is
tracked separately and is not changed by the product docs path.

CI lint does not apply fixes. Repo-wide `format:check` is not a CI gate.
